import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/";
const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = null;

function logout() {
  localStorage.clear();
  window.location.href = "/login";
}

// Access token (60 daqiqa) tugaganda refresh token bilan yangilaydi.
// Muhim: muddati o'tgan token ochiq (public) sahifalarda ham 401 berardi.
api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const { config, response } = error;
    const url = config?.url || "";
    const isAuthCall = url.includes("auth/login") || url.includes("auth/refresh");
    if (response?.status === 401 && config && !config._retry && !isAuthCall) {
      config._retry = true;
      const accessBefore = localStorage.getItem("access");
      const refresh = localStorage.getItem("refresh");
      if (!accessBefore) return Promise.reject(error);
      if (refresh) {
        try {
          refreshing =
            refreshing ||
            axios
              .post(`${API_URL}auth/refresh/`, { refresh })
              .then((r) => {
                localStorage.setItem("access", r.data.access);
                if (r.data.refresh) localStorage.setItem("refresh", r.data.refresh);
                return r.data.access;
              })
              .finally(() => {
                refreshing = null;
              });
          const access = await refreshing;
          config.headers.Authorization = `Bearer ${access}`;
          return api(config);
        } catch {
          /* refresh ham yaroqsiz — pastda logout */
        }
      }
      logout();
    }
    return Promise.reject(error);
  }
);

export default api;
