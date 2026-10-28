import React, { useEffect, useMemo, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  Link,
  useNavigate,
  useLocation,
} from "react-router-dom";
import api from "./api";

/* =========================================================
   CONFIG
========================================================= */

const API_ORIGIN = "http://127.0.0.1:8000";

const STAFF = ["admin", "manager", "register"];

const ALL_ROUTES = [
  "/",
  "/rooms",
  "/room-types",
  "/bookings",
  "/users",
  "/managers",
  "/registers",
  "/payments",
  "/reviews",
];

const ALLOWED = {
  admin: ALL_ROUTES,

  manager: ALL_ROUTES.filter(
    (route) =>
      !["/users", "/managers", "/registers"].includes(route)
  ),

  register: ["/", "/bookings", "/payments"],
};

/* =========================================================
   HELPERS
========================================================= */

function getUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

function getRole() {
  return getUser()?.role || "";
}

function unwrap(data) {
  if (Array.isArray(data)) return data;

  if (Array.isArray(data?.results)) {
    return data.results;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  return [];
}

function money(value) {
  return (
    new Intl.NumberFormat("uz-UZ").format(
      Number(value || 0)
    ) + " so'm"
  );
}

function errorMessage(error, fallback = "Xatolik yuz berdi") {
  const data = error?.response?.data;

  if (!data) return fallback;

  if (typeof data === "string") {
    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  if (data.error) {
    return data.error;
  }

  const first = Object.values(data)[0];

  if (Array.isArray(first)) {
    return first[0];
  }

  if (typeof first === "string") {
    return first;
  }

  return fallback;
}

function imageUrl(image) {
  if (!image) return "";

  const value =
    typeof image === "string"
      ? image
      : image.url ||
        image.image ||
        image.path ||
        "";

  if (!value) return "";

  if (
    value.startsWith("http://") ||
    value.startsWith("https://")
  ) {
    return value;
  }

  return `${API_ORIGIN}${
    value.startsWith("/") ? "" : "/"
  }${value}`;
}

/*
  Backenddan keladigan barcha mumkin bo'lgan
  image formatlarini bitta massivga aylantiramiz.
*/
function normalizeImages(room) {
  if (!room) return [];

  const result = [];

  if (Array.isArray(room.images)) {
    room.images.forEach((item, index) => {
      if (!item) return;

      if (typeof item === "string") {
        result.push({
          id: `legacy-${index}`,
          image: item,
        });
      } else if (
        item.image ||
        item.url ||
        item.path
      ) {
        result.push(item);
      }
    });
  }

  /*
    Eski Room.image ham ishlasin.
  */
  if (room.image) {
    const exists = result.some(
      (item) =>
        imageUrl(item) === imageUrl(room.image)
    );

    if (!exists) {
      result.unshift({
        id: `legacy-main-${room.id}`,
        image: room.image,
      });
    }
  }

  return result;
}

/* =========================================================
   ERROR
========================================================= */

function ErrorBox({ error }) {
  if (!error) return null;

  return (
    <div className="error-box">
      {error}
    </div>
  );
}

/* =========================================================
   HEADER
========================================================= */

function Header({
  eyebrow,
  title,
  action,
}) {
  return (
    <div className="page-header">
      <div>
        {eyebrow && (
          <div className="eyebrow">
            {eyebrow}
          </div>
        )}

        <h1>{title}</h1>
      </div>

      {action && (
        <div className="header-action">
          {action}
        </div>
      )}
    </div>
  );
}

/* =========================================================
   MODAL
========================================================= */

function Modal({
  title,
  children,
  onClose,
  wide = false,
}) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`modal ${
          wide ? "modal-wide" : ""
        }`}
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button
            type="button"
            className="modal-close"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

/* =========================================================
   IMAGE CAROUSEL
========================================================= */

function ImageCarousel({
  images,
  alt = "Xona rasmi",
}) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [images]);

  if (!images?.length) {
    return (
      <div className="room-image-empty">
        <span>Rasm yo‘q</span>
      </div>
    );
  }

  const current =
    images[index] || images[0];

  function previous() {
    setIndex((old) =>
      old === 0
        ? images.length - 1
        : old - 1
    );
  }

  function next() {
    setIndex((old) =>
      old === images.length - 1
        ? 0
        : old + 1
    );
  }

  return (
    <div className="carousel">
      <img
        src={imageUrl(current)}
        alt={alt}
        className="carousel-image"
      />

      {images.length > 1 && (
        <>
          <button
            type="button"
            className="carousel-arrow left"
            onClick={previous}
          >
            ‹
          </button>

          <button
            type="button"
            className="carousel-arrow right"
            onClick={next}
          >
            ›
          </button>

          <div className="carousel-counter">
            {index + 1} / {images.length}
          </div>

          <div className="carousel-dots">
            {images.map((_, i) => (
              <button
                type="button"
                key={i}
                className={
                  i === index
                    ? "active"
                    : ""
                }
                onClick={() =>
                  setIndex(i)
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* =========================================================
   LOGIN
========================================================= */

function Login() {
  const navigate = useNavigate();

  const [username, setUsername] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function submit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await api.post(
        "auth/login/",
        {
          username,
          password,
        }
      );

      const user = response.data.user;

      if (!STAFF.includes(user.role)) {
        setError(
          "Bu panelga faqat admin, menejer va register xodimlari kira oladi."
        );

        return;
      }

      localStorage.setItem(
        "access",
        response.data.access
      );

      localStorage.setItem(
        "refresh",
        response.data.refresh
      );

      localStorage.setItem(
        "user",
        JSON.stringify(user)
      );

      navigate("/");
    } catch (error) {
      setError(
        error?.response?.status === 401
          ? "Login yoki parol noto‘g‘ri"
          : errorMessage(
              error,
              "Serverga ulanib bo‘lmadi"
            )
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form
        className="login-card"
        onSubmit={submit}
      >
        <div className="brand login-brand">
          HOTEL <span>ADMIN</span>
        </div>

        <div className="login-title">
          Admin panel
        </div>

        <p className="login-subtitle">
          Hotel boshqaruv tizimiga kirish
        </p>

        <ErrorBox error={error} />

        <label>
          Username
          <input
            required
            value={username}
            onChange={(e) =>
              setUsername(e.target.value)
            }
            placeholder="admin"
          />
        </label>

        <label>
          Parol
          <input
            required
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
            placeholder="••••••••"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Kirilmoqda..."
            : "Kirish"}
        </button>
      </form>
    </div>
  );
}

/* =========================================================
   PROTECTED
========================================================= */

function Protected({ children }) {
  const access =
    localStorage.getItem("access");

  if (
    !access ||
    !STAFF.includes(getRole())
  ) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return children;
}

/* =========================================================
   LAYOUT
========================================================= */

function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();

  const user = getUser();
  const currentRole = getRole();

  const links = [
    {
      path: "/",
      label: "Dashboard",
    },
    {
      path: "/rooms",
      label: "Xonalar",
    },
    {
      path: "/room-types",
      label: "Xona turlari",
    },
    {
      path: "/bookings",
      label: "Bronlar",
    },
    {
      path: "/users",
      label: "Foydalanuvchilar",
    },
    {
      path: "/managers",
      label: "Menejerlar",
    },
    {
      path: "/registers",
      label: "Register",
    },
    {
      path: "/payments",
      label: "To‘lovlar",
    },
    {
      path: "/reviews",
      label: "Sharhlar",
    },
  ];

  const visibleLinks =
    links.filter((item) =>
      ALLOWED[currentRole]?.includes(
        item.path
      )
    );

  function logout() {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");

    navigate("/login");
  }

  const activeLink =
    visibleLinks.find((item) => {
      if (item.path === "/") {
        return location.pathname === "/";
      }

      return location.pathname.startsWith(
        item.path
      );
    })?.label || "Dashboard";

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            HOTEL <span>ADMIN</span>
          </div>

          <div className="sidebar-label">
            ADMIN PANEL
          </div>

          <nav className="sidebar-nav">
            {visibleLinks.map((item) => {
              const active =
                item.path === "/"
                  ? location.pathname === "/"
                  : location.pathname.startsWith(
                      item.path
                    );

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={
                    active
                      ? "nav-link active"
                      : "nav-link"
                  }
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-avatar">
              {(user.username ||
                "A")
                .charAt(0)
                .toUpperCase()}
            </div>

            <div>
              <strong>
                {user.username ||
                  "Admin"}
              </strong>

              <span>
                {user.role ||
                  "admin"}
              </span>
            </div>
          </div>

          <button
            className="logout"
            onClick={logout}
          >
            Chiqish
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div>
            <div className="topbar-title">
              Hotel Management
            </div>

            <div className="topbar-subtitle">
              Boshqaruv tizimi
            </div>
          </div>

          <div className="profile">
            <div className="profile-info">
              <strong>
                {user.username ||
                  "Admin"}
              </strong>

              <span>
                {user.role ||
                  "admin"}
              </span>
            </div>

            <div className="avatar">
              {(user.username ||
                "A")
                .charAt(0)
                .toUpperCase()}
            </div>
          </div>
        </header>

        <main className="page">
          <div className="current-page-name">
            {activeLink}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard() {
  const [rooms, setRooms] =
    useState([]);

  const [bookings, setBookings] =
    useState([]);

  const [users, setUsers] =
    useState([]);

  const [payments, setPayments] =
    useState([]);

  useEffect(() => {
    Promise.all([
      api.get("rooms/"),
      api.get("bookings/"),
      api.get("auth/users/"),
      api.get("payments/"),
    ])
      .then(
        ([
          roomsRes,
          bookingsRes,
          usersRes,
          paymentsRes,
        ]) => {
          setRooms(
            unwrap(roomsRes.data)
          );

          setBookings(
            unwrap(bookingsRes.data)
          );

          setUsers(
            unwrap(usersRes.data)
          );

          setPayments(
            unwrap(paymentsRes.data)
          );
        }
      )
      .catch(() => {});
  }, []);

  const available =
    rooms.filter(
      (x) =>
        x.status === "available"
    ).length;

  const occupied =
    rooms.filter(
      (x) =>
        x.status === "occupied"
    ).length;

  const maintenance =
    rooms.filter(
      (x) =>
        x.status === "maintenance"
    ).length;

  const revenue =
    payments
      .filter(
        (x) => x.status === "paid"
      )
      .reduce(
        (sum, x) =>
          sum + Number(x.amount || 0),
        0
      );

  return (
    <>
      <Header
        eyebrow="OVERVIEW"
        title="Dashboard"
      />

      <div className="stats-grid">
        <div className="stat-card">
          <span>Jami xonalar</span>
          <strong>{rooms.length}</strong>
        </div>

        <div className="stat-card">
          <span>Bo‘sh</span>
          <strong>{available}</strong>
        </div>

        <div className="stat-card">
          <span>Band</span>
          <strong>{occupied}</strong>
        </div>

        <div className="stat-card">
          <span>Ta’mirda</span>
          <strong>{maintenance}</strong>
        </div>

        <div className="stat-card">
          <span>Bronlar</span>
          <strong>
            {bookings.length}
          </strong>
        </div>

        <div className="stat-card">
          <span>Foydalanuvchilar</span>
          <strong>
            {users.length}
          </strong>
        </div>

        <div className="stat-card revenue-card">
          <span>Umumiy tushum</span>
          <strong>
            {money(revenue)}
          </strong>
        </div>
      </div>
    </>
  );
}

/* =========================================================
   ROOMS
========================================================= */

function Rooms() {
  const [rooms, setRooms] =
    useState([]);

  const [types, setTypes] =
    useState([]);

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("");

  const [open, setOpen] =
    useState(false);

  const [edit, setEdit] =
    useState(null);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const params =
        new URLSearchParams();

      if (search.trim()) {
        params.set(
          "q",
          search.trim()
        );
      }

      if (status) {
        params.set(
          "status",
          status
        );
      }

      const query =
        params.toString();

      const [
        roomsResponse,
        typesResponse,
      ] = await Promise.all([
        api.get(
          `rooms/${
            query
              ? `?${query}`
              : ""
          }`
        ),
        api.get("rooms/types/"),
      ]);

      setRooms(
        unwrap(
          roomsResponse.data
        )
      );

      setTypes(
        unwrap(
          typesResponse.data
        )
      );
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Xonalarni yuklashda xato"
        )
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer =
      setTimeout(load, 250);

    return () =>
      clearTimeout(timer);
  }, [search, status]);

  async function remove(id) {
    if (
      !window.confirm(
        "Xona o‘chirilsinmi?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `rooms/${id}/`
      );

      await load();
    } catch (error) {
      alert(
        errorMessage(
          error,
          "Xonani o‘chirib bo‘lmadi"
        )
      );
    }
  }

  return (
    <>
      <Header
        eyebrow="INVENTORY"
        title="Xonalar"
        action={
          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            + Xona qo‘shish
          </button>
        }
      />

      <ErrorBox error={error} />

      <div className="filters">
        <input
          placeholder="Xona qidirish..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        <select
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >
          <option value="">
            Barcha status
          </option>

          <option value="available">
            Bo‘sh
          </option>

          <option value="occupied">
            Band
          </option>

          <option value="maintenance">
            Ta’mirda
          </option>
        </select>
      </div>

      {loading ? (
        <div className="loading-card">
          Xonalar yuklanmoqda...
        </div>
      ) : (
        <div className="room-grid">
          {rooms.map((room) => {
            const images =
              normalizeImages(room);

            return (
              <article
                className="room-card"
                key={room.id}
              >
                <div className="room-card-image">
                  <ImageCarousel
                    images={images}
                    alt={`Xona ${room.number}`}
                  />

                  <span
                    className={`room-status ${room.status}`}
                  >
                    {room.status ===
                      "available" &&
                      "Bo‘sh"}

                    {room.status ===
                      "occupied" &&
                      "Band"}

                    {room.status ===
                      "maintenance" &&
                      "Ta’mirda"}
                  </span>
                </div>

                <div className="room-card-content">
                  <div className="room-number">
                    #{room.number}
                  </div>

                  <h3>
                    {room.room_type
                      ?.name ||
                      "Xona"}
                  </h3>

                  <div className="room-info">
                    <span>
                      {room.floor}-qavat
                    </span>

                    <strong>
                      {money(
                        room.room_type
                          ?.price_per_night
                      )}
                    </strong>
                  </div>

                  {images.length > 0 && (
                    <div className="room-image-count">
                      {images.length} ta rasm
                    </div>
                  )}

                  {room.description && (
                    <p>
                      {room.description}
                    </p>
                  )}

                  <div className="room-actions">
                    <button
                      className="small"
                      onClick={() => {
                        setEdit(room);
                        setOpen(true);
                      }}
                    >
                      Tahrirlash
                    </button>

                    <button
                      className="danger small"
                      onClick={() =>
                        remove(room.id)
                      }
                    >
                      O‘chirish
                    </button>
                  </div>
                </div>
              </article>
            );
          })}

          {!rooms.length && (
            <div className="empty-card">
              Xona topilmadi.
            </div>
          )}
        </div>
      )}

      {open && (
        <RoomModal
          room={edit}
          types={types}
          onClose={() =>
            setOpen(false)
          }
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </>
  );
}

/* =========================================================
   ROOM MODAL
========================================================= */

function RoomModal({
  room,
  types,
  onClose,
  onSaved,
}) {
  const [form, setForm] =
    useState({
      number:
        room?.number || "",
      floor:
        room?.floor || 1,
      room_type_id:
        room?.room_type?.id || "",
      status:
        room?.status || "available",
      description:
        room?.description || "",
    });

  const [images, setImages] =
    useState([]);

  const [currentImages, setCurrentImages] =
    useState(
      normalizeImages(room)
    );

  const [error, setError] =
    useState("");

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    setCurrentImages(
      normalizeImages(room)
    );

    setImages([]);
    setError("");
  }, [room]);

  function selectImages(e) {
    const selected = Array.from(
      e.target.files || []
    );

    if (!selected.length) {
      return;
    }

    setImages((old) => [
      ...old,
      ...selected,
    ]);

    e.target.value = "";
  }

  function removeSelectedImage(
    index
  ) {
    setImages((old) =>
      old.filter(
        (_, i) => i !== index
      )
    );
  }

  async function deleteExistingImage(
    image
  ) {
    if (
      !image?.id ||
      String(image.id).startsWith(
        "legacy-"
      )
    ) {
      return;
    }

    if (
      !window.confirm(
        "Bu rasm o‘chirilsinmi?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `rooms/${room.id}/images/${image.id}/`
      );

      setCurrentImages(
        (old) =>
          old.filter(
            (item) =>
              item.id !== image.id
          )
      );
    } catch (error) {
      alert(
        errorMessage(
          error,
          "Rasmni o‘chirib bo‘lmadi"
        )
      );
    }
  }

  async function save(e) {
    e.preventDefault();

    setError("");
    setSaving(true);

    try {
      /*
        1. Avval xona ma'lumotlari.
      */

      const payload = {
        number:
          form.number.trim(),

        floor:
          Number(form.floor),

        room_type_id:
          Number(form.room_type_id),

        description:
          form.description,
      };

      let roomId =
        room?.id;

      if (room) {
        await api.patch(
          `rooms/${room.id}/`,
          payload
        );
      } else {
        const response =
          await api.post(
            "rooms/",
            payload
          );

        roomId =
          response.data.id;
      }

      /*
        2. Status.
      */

      if (
        room &&
        form.status !==
          room.status
      ) {
        await api.post(
          `rooms/${roomId}/status/`,
          {
            status:
              form.status,
          }
        );
      }

      /*
        3. KO‘P RASM.

        Muhim:
        endpoint:
        /rooms/{id}/upload_images/

        field:
        images
      */

      if (
        roomId &&
        images.length > 0
      ) {
        const formData =
          new FormData();

        images.forEach(
          (file) => {
            formData.append(
              "images",
              file
            );
          }
        );

        await api.post(
          `rooms/${roomId}/upload_images/`,
          formData
        );
      }

      await onSaved();
    } catch (error) {
      console.error(error);

      setError(
        errorMessage(
          error,
          "Xonani saqlashda xato"
        )
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      title={
        room
          ? "Xonani tahrirlash"
          : "Yangi xona"
      }
      onClose={onClose}
      wide
    >
      <ErrorBox error={error} />

      <form
        className="formgrid"
        onSubmit={save}
      >
        <label>
          Xona raqami

          <input
            required
            value={form.number}
            onChange={(e) =>
              setForm({
                ...form,
                number:
                  e.target.value,
              })
            }
            placeholder="101"
          />
        </label>

        <label>
          Qavat

          <input
            type="number"
            min="1"
            required
            value={form.floor}
            onChange={(e) =>
              setForm({
                ...form,
                floor:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Xona turi

          <select
            required
            value={
              form.room_type_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                room_type_id:
                  e.target.value,
              })
            }
          >
            <option value="">
              Xona turini tanlang
            </option>

            {types.map((type) => (
              <option
                key={type.id}
                value={type.id}
              >
                {type.name} —{" "}
                {money(
                  type.price_per_night
                )}
              </option>
            ))}
          </select>
        </label>

        {room && (
          <label>
            Status

            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status:
                    e.target.value,
                })
              }
            >
              <option value="available">
                Bo‘sh
              </option>

              <option value="occupied">
                Band
              </option>

              <option value="maintenance">
                Ta’mirda
              </option>
            </select>
          </label>
        )}

        {/* CURRENT IMAGES */}

        {currentImages.length >
          0 && (
          <div className="wide image-section">
            <div className="image-section-header">
              <div>
                <strong>
                  Mavjud rasmlar
                </strong>

                <span>
                  {currentImages.length} ta
                </span>
              </div>
            </div>

            <div className="image-gallery">
              {currentImages.map(
                (image, index) => (
                  <div
                    className="image-item"
                    key={
                      image.id ||
                      index
                    }
                  >
                    <img
                      src={imageUrl(
                        image
                      )}
                      alt={`Xona rasmi ${
                        index + 1
                      }`}
                    />

                    {!String(
                      image.id
                    ).startsWith(
                      "legacy-"
                    ) && (
                      <button
                        type="button"
                        className="image-delete"
                        onClick={() =>
                          deleteExistingImage(
                            image
                          )
                        }
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* NEW IMAGES */}

        {images.length > 0 && (
          <div className="wide image-section">
            <div className="image-section-header">
              <div>
                <strong>
                  Yangi tanlangan rasmlar
                </strong>

                <span>
                  {images.length} ta
                </span>
              </div>
            </div>

            <div className="image-gallery">
              {images.map(
                (file, index) => (
                  <div
                    className="image-item"
                    key={`${file.name}-${file.size}-${index}`}
                  >
                    <img
                      src={URL.createObjectURL(
                        file
                      )}
                      alt={file.name}
                    />

                    <button
                      type="button"
                      className="image-delete"
                      onClick={() =>
                        removeSelectedImage(
                          index
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* UPLOAD */}

        <div className="wide image-section">
          <div className="image-section-header">
            <div>
              <strong>
                Xona rasmlari
              </strong>

              <span>
                Bir nechta rasm tanlash mumkin
              </span>
            </div>
          </div>

          <label className="upload-box">
            <div className="upload-plus">
              +
            </div>

            <strong>
              Rasmlarni tanlash
            </strong>

            <span>
              JPG, PNG yoki WEBP
            </span>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={
                selectImages
              }
            />
          </label>
        </div>

        <label className="wide">
          Xona haqida izoh

          <textarea
            rows="5"
            value={
              form.description
            }
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
            placeholder="Xona haqida ma'lumot..."
          />
        </label>

        <div className="modal-actions wide">
          <button
            type="button"
            className="secondary"
            onClick={onClose}
          >
            Bekor qilish
          </button>

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saqlanmoqda..."
              : "Saqlash"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

/* =========================================================
   ROOM TYPES
========================================================= */

function RoomTypes() {
  const [items, setItems] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  const [edit, setEdit] =
    useState(null);

  const [error, setError] =
    useState("");

  async function load() {
    try {
      setError("");

      const response =
        await api.get(
          "rooms/types/"
        );

      setItems(
        unwrap(response.data)
      );
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Xona turlarini yuklashda xato"
        )
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id) {
    if (
      !window.confirm(
        "Xona turi o‘chirilsinmi?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `rooms/types/${id}/`
      );

      load();
    } catch (error) {
      alert(
        errorMessage(
          error,
          "O‘chirib bo‘lmadi"
        )
      );
    }
  }

  return (
    <>
      <Header
        eyebrow="INVENTORY"
        title="Xona turlari"
        action={
          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            + Tur qo‘shish
          </button>
        }
      />

      <ErrorBox error={error} />

      <div className="cards">
        {items.map((item) => (
          <div
            className="panel card"
            key={item.id}
          >
            <div className="card-label">
              ROOM TYPE
            </div>

            <h2>{item.name}</h2>

            <p>
              {item.description ||
                "Tavsif mavjud emas"}
            </p>

            <strong>
              {money(
                item.price_per_night
              )}{" "}
              / kecha
            </strong>

            <span>
              Sig‘im:{" "}
              {item.capacity}
            </span>

            <span>
              Xonalar:{" "}
              {item.room_count ||
                0}
            </span>

            <div className="card-actions">
              <button
                className="small"
                onClick={() => {
                  setEdit(item);
                  setOpen(true);
                }}
              >
                Tahrirlash
              </button>

              <button
                className="danger small"
                onClick={() =>
                  remove(item.id)
                }
              >
                O‘chirish
              </button>
            </div>
          </div>
        ))}

        {!items.length && (
          <div className="empty-card">
            Xona turi topilmadi.
          </div>
        )}
      </div>

      {open && (
        <TypeModal
          item={edit}
          onClose={() =>
            setOpen(false)
          }
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function TypeModal({
  item,
  onClose,
  onSaved,
}) {
  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      name: item?.name || "",
      description:
        item?.description || "",
      capacity:
        item?.capacity || 2,
      price_per_night:
        item?.price_per_night || 0,
      amenities:
        Array.isArray(
          item?.amenities
        )
          ? item.amenities.join(
              ", "
            )
          : "",
    });

  async function save(e) {
    e.preventDefault();

    try {
      const data = {
        ...form,
        capacity:
          Number(form.capacity),
        price_per_night:
          Number(
            form.price_per_night
          ),
        amenities:
          form.amenities
            .split(",")
            .map((x) =>
              x.trim()
            )
            .filter(Boolean),
      };

      if (item) {
        await api.patch(
          `rooms/types/${item.id}/`,
          data
        );
      } else {
        await api.post(
          "rooms/types/",
          data
        );
      }

      onSaved();
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Saqlashda xato"
        )
      );
    }
  }

  return (
    <Modal
      title={
        item
          ? "Xona turini tahrirlash"
          : "Yangi xona turi"
      }
      onClose={onClose}
    >
      <ErrorBox error={error} />

      <form
        className="formgrid"
        onSubmit={save}
      >
        <label>
          Nomi

          <input
            required
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Sig‘im

          <input
            type="number"
            min="1"
            required
            value={
              form.capacity
            }
            onChange={(e) =>
              setForm({
                ...form,
                capacity:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Narx

          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={
              form.price_per_night
            }
            onChange={(e) =>
              setForm({
                ...form,
                price_per_night:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Qulayliklar

          <input
            value={
              form.amenities
            }
            onChange={(e) =>
              setForm({
                ...form,
                amenities:
                  e.target.value,
              })
            }
            placeholder="Wi-Fi, TV, Konditsioner"
          />
        </label>

        <label className="wide">
          Tavsif

          <textarea
            value={
              form.description
            }
            onChange={(e) =>
              setForm({
                ...form,
                description:
                  e.target.value,
              })
            }
          />
        </label>

        <button type="submit">
          Saqlash
        </button>
      </form>
    </Modal>
  );
}

/* =========================================================
   USERS
========================================================= */

function Users({
  kind = "users",
  title = "Foydalanuvchilar",
  roleFilter = "",
}) {
  const [users, setUsers] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  const [edit, setEdit] =
    useState(null);

  const [error, setError] =
    useState("");

  async function load() {
    try {
      const response =
        await api.get(
          `auth/${kind}/`
        );

      setUsers(
        unwrap(response.data)
      );
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Foydalanuvchilarni yuklashda xato"
        )
      );
    }
  }

  useEffect(() => {
    load();
  }, [kind]);

  async function remove(id) {
    if (
      !window.confirm(
        "Foydalanuvchi o‘chirilsinmi?"
      )
    ) {
      return;
    }

    try {
      await api.delete(
        `auth/${kind}/${id}/`
      );

      load();
    } catch (error) {
      alert(
        errorMessage(
          error,
          "O‘chirib bo‘lmadi"
        )
      );
    }
  }

  return (
    <>
      <Header
        eyebrow="ACCESS"
        title={title}
        action={
          <button
            onClick={() => {
              setEdit(null);
              setOpen(true);
            }}
          >
            + Qo‘shish
          </button>
        }
      />

      <ErrorBox error={error} />

      <div className="panel table-wrap">
        <div className="table">
          <div className="table-row table-head">
            <b>USERNAME</b>
            <b>ISM</b>
            <b>EMAIL</b>
            <b>TELEFON</b>
            <b>ROLE</b>
            <b>HOLAT</b>
            <b>AMALLAR</b>
          </div>

          {users.map((user) => (
            <div
              className="table-row"
              key={user.id}
            >
              <strong>
                {user.username}
              </strong>

              <span>
                {user.first_name}{" "}
                {user.last_name}
              </span>

              <span>
                {user.email ||
                  "—"}
              </span>

              <span>
                {user.phone ||
                  "—"}
              </span>

              <span className="role-badge">
                {user.role}
              </span>

              <span>
                {user.is_active
                  ? "Faol"
                  : "Bloklangan"}
              </span>

              <div className="table-actions">
                <button
                  className="small"
                  onClick={() => {
                    setEdit(user);
                    setOpen(true);
                  }}
                >
                  Tahrirlash
                </button>

                <button
                  className="danger small"
                  onClick={() =>
                    remove(user.id)
                  }
                >
                  O‘chirish
                </button>
              </div>
            </div>
          ))}

          {!users.length && (
            <div className="empty-table">
              Foydalanuvchilar mavjud emas.
            </div>
          )}
        </div>
      </div>

      {open && (
        <UserModal
          item={edit}
          kind={kind}
          roleFilter={roleFilter}
          onClose={() =>
            setOpen(false)
          }
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function UserModal({
  item,
  kind,
  roleFilter,
  onClose,
  onSaved,
}) {
  const [error, setError] =
    useState("");

  const [form, setForm] =
    useState({
      username:
        item?.username || "",
      email:
        item?.email || "",
      first_name:
        item?.first_name || "",
      last_name:
        item?.last_name || "",
      phone:
        item?.phone || "",
      role:
        item?.role ||
        roleFilter ||
        "user",
      password: "",
    });

  async function save(e) {
    e.preventDefault();

    setError("");

    try {
      const data = {
        ...form,
      };

      if (!data.password) {
        delete data.password;
      }

      if (item) {
        await api.patch(
          `auth/${kind}/${item.id}/`,
          data
        );
      } else {
        await api.post(
          `auth/${kind}/`,
          data
        );
      }

      onSaved();
    } catch (error) {
      setError(
        errorMessage(
          error,
          "Saqlashda xato"
        )
      );
    }
  }

  return (
    <Modal
      title={
        item
          ? "Foydalanuvchini tahrirlash"
          : "Yangi foydalanuvchi"
      }
      onClose={onClose}
    >
      <ErrorBox error={error} />

      <form
        className="formgrid"
        onSubmit={save}
      >
        <label>
          Username
          <input
            required={!item}
            value={
              form.username
            }
            onChange={(e) =>
              setForm({
                ...form,
                username:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Email
          <input
            type="email"
            required={!item}
            value={
              form.email
            }
            onChange={(e) =>
              setForm({
                ...form,
                email:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Ism
          <input
            required={!item}
            value={
              form.first_name
            }
            onChange={(e) =>
              setForm({
                ...form,
                first_name:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Familiya
          <input
            required={!item}
            value={
              form.last_name
            }
            onChange={(e) =>
              setForm({
                ...form,
                last_name:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Telefon
          <input
            value={
              form.phone
            }
            onChange={(e) =>
              setForm({
                ...form,
                phone:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Parol
          <input
            type="password"
            required={!item}
            value={
              form.password
            }
            onChange={(e) =>
              setForm({
                ...form,
                password:
                  e.target.value,
              })
            }
          />
        </label>

        {!roleFilter && (
          <label>
            Role

            <select
              value={form.role}
              onChange={(e) =>
                setForm({
                  ...form,
                  role:
                    e.target.value,
                })
              }
            >
              <option value="admin">
                admin
              </option>

              <option value="manager">
                manager
              </option>

              <option value="register">
                register
              </option>

              <option value="user">
                user
              </option>
            </select>
          </label>
        )}

        <button type="submit">
          Saqlash
        </button>
      </form>
    </Modal>
  );
}

/* =========================================================
   BOOKINGS
========================================================= */

function Bookings() {
  const [items, setItems] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    api
      .get("bookings/")
      .then((response) =>
        setItems(
          unwrap(response.data)
        )
      )
      .catch(() =>
        setItems([])
      )
      .finally(() =>
        setLoading(false)
      );
  }, []);

  return (
    <>
      <Header
        eyebrow="RESERVATIONS"
        title="Bronlar"
      />

      <div className="panel table-wrap">
        <div className="table">
          <div className="table-row table-head">
            <b>ID</b>
            <b>MIJOZ</b>
            <b>XONA</b>
            <b>KIRISH</b>
            <b>CHIQISH</b>
            <b>MEHMON</b>
            <b>STATUS</b>
          </div>

          {loading && (
            <div className="empty-table">
              Yuklanmoqda...
            </div>
          )}

          {!loading &&
            items.map((item) => (
              <div
                className="table-row"
                key={item.id}
              >
                <strong>
                  #{item.id}
                </strong>

                <span>
                  {item.user_name ||
                    item.user?.username ||
                    "—"}
                </span>

                <span>
                  {item.room_number ||
                    item.room?.number ||
                    "—"}
                </span>

                <span>
                  {item.check_in ||
                    "—"}
                </span>

                <span>
                  {item.check_out ||
                    "—"}
                </span>

                <span>
                  {item.guests ||
                    "—"}
                </span>

                <span className="role-badge">
                  {item.status ||
                    "—"}
                </span>
              </div>
            ))}

          {!loading &&
            !items.length && (
              <div className="empty-table">
                Bronlar mavjud emas.
              </div>
            )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   PAYMENTS
========================================================= */

function Payments() {
  const [items, setItems] =
    useState([]);

  const [open, setOpen] =
    useState(false);

  async function load() {
    try {
      const response =
        await api.get(
          "payments/"
        );

      setItems(
        unwrap(response.data)
      );
    } catch {
      setItems([]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <Header
        eyebrow="FINANCE"
        title="To‘lovlar"
        action={
          <button
            onClick={() =>
              setOpen(true)
            }
          >
            + Yangi to‘lov
          </button>
        }
      />

      <div className="panel table-wrap">
        <div className="table">
          <div className="table-row table-head">
            <b>ID</b>
            <b>BRON</b>
            <b>SUMMA</b>
            <b>USUL</b>
            <b>STATUS</b>
            <b>TRANSACTION</b>
          </div>

          {items.map((item) => (
            <div
              className="table-row"
              key={item.id}
            >
              <strong>
                #{item.id}
              </strong>

              <span>
                {item.booking ||
                  item.booking_id ||
                  "—"}
              </span>

              <strong>
                {money(item.amount)}
              </strong>

              <span>
                {item.method ||
                  "—"}
              </span>

              <span>
                {item.status ||
                  "—"}
              </span>

              <span>
                {item.transaction_id ||
                  "—"}
              </span>
            </div>
          ))}

          {!items.length && (
            <div className="empty-table">
              To‘lovlar mavjud emas.
            </div>
          )}
        </div>
      </div>

      {open && (
        <PaymentModal
          onClose={() =>
            setOpen(false)
          }
          onSaved={() => {
            setOpen(false);
            load();
          }}
        />
      )}
    </>
  );
}

function PaymentModal({
  onClose,
  onSaved,
}) {
  const [error, setError] =
    useState("");

  const [bookings, setBookings] =
    useState([]);

  const [form, setForm] =
    useState({
      booking: "",
      amount: "",
      method: "cash",
      status: "paid",
      transaction_id: "",
      note: "",
    });

  useEffect(() => {
    api
      .get("bookings/")
      .then((response) =>
        setBookings(
          unwrap(response.data)
        )
      )
      .catch(() =>
        setBookings([])
      );
  }, []);

  async function save(e) {
    e.preventDefault();

    try {
      await api.post(
        "payments/",
        form
      );

      onSaved();
    } catch (error) {
      setError(
        errorMessage(
          error,
          "To‘lovni saqlashda xato"
        )
      );
    }
  }

  return (
    <Modal
      title="Yangi to‘lov"
      onClose={onClose}
    >
      <ErrorBox error={error} />

      <form
        className="formgrid"
        onSubmit={save}
      >
        <label>
          Bron

          <select
            required
            value={
              form.booking
            }
            onChange={(e) =>
              setForm({
                ...form,
                booking:
                  e.target.value,
              })
            }
          >
            <option value="">
              Tanlang
            </option>

            {bookings.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                #{item.id} ·{" "}
                {item.user_name ||
                  "Mijoz"}{" "}
                · xona{" "}
                {item.room_number ||
                  "—"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Summa

          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={
              form.amount
            }
            onChange={(e) =>
              setForm({
                ...form,
                amount:
                  e.target.value,
              })
            }
          />
        </label>

        <label>
          Usul

          <select
            value={
              form.method
            }
            onChange={(e) =>
              setForm({
                ...form,
                method:
                  e.target.value,
              })
            }
          >
            <option value="cash">
              Naqd
            </option>

            <option value="card">
              Karta
            </option>

            <option value="transfer">
              Bank
            </option>
          </select>
        </label>

        <label>
          Holat

          <select
            value={
              form.status
            }
            onChange={(e) =>
              setForm({
                ...form,
                status:
                  e.target.value,
              })
            }
          >
            <option value="paid">
              To‘langan
            </option>

            <option value="pending">
              Kutilmoqda
            </option>

            <option value="refunded">
              Qaytarilgan
            </option>
          </select>
        </label>

        <label>
          Transaction ID

          <input
            value={
              form.transaction_id
            }
            onChange={(e) =>
              setForm({
                ...form,
                transaction_id:
                  e.target.value,
              })
            }
          />
        </label>

        <label className="wide">
          Izoh

          <input
            value={
              form.note
            }
            onChange={(e) =>
              setForm({
                ...form,
                note:
                  e.target.value,
              })
            }
          />
        </label>

        <button type="submit">
          Saqlash
        </button>
      </form>
    </Modal>
  );
}

/* =========================================================
   REVIEWS
========================================================= */

function Reviews() {
  const [items, setItems] =
    useState([]);

  useEffect(() => {
    api
      .get("reviews/")
      .then((response) =>
        setItems(
          unwrap(response.data)
        )
      )
      .catch(() =>
        setItems([])
      );
  }, []);

  return (
    <>
      <Header
        eyebrow="FEEDBACK"
        title="Sharhlar"
      />

      <div className="panel table-wrap">
        <div className="table">
          <div className="table-row table-head">
            <b>ID</b>
            <b>FOYDALANUVCHI</b>
            <b>XONA</b>
            <b>RATING</b>
            <b>IZOH</b>
            <b>SANA</b>
          </div>

          {items.map((item) => (
            <div
              className="table-row"
              key={item.id}
            >
              <strong>
                #{item.id}
              </strong>

              <span>
                {item.user_name ||
                  item.user?.username ||
                  "—"}
              </span>

              <span>
                {item.room_number ||
                  "—"}
              </span>

              <strong>
                {item.rating ||
                  "—"}
                /5
              </strong>

              <span>
                {item.comment ||
                  "—"}
              </span>

              <span>
                {item.created_at ||
                  "—"}
              </span>
            </div>
          ))}

          {!items.length && (
            <div className="empty-table">
              Sharhlar mavjud emas.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* =========================================================
   APP
========================================================= */

export default function App() {
  return (
    <Routes>
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/*"
        element={
          <Protected>
            <Layout>
              <Routes>
                <Route
                  path="/"
                  element={
                    <Dashboard />
                  }
                />

                <Route
                  path="/rooms"
                  element={
                    <Rooms />
                  }
                />

                <Route
                  path="/room-types"
                  element={
                    <RoomTypes />
                  }
                />

                <Route
                  path="/bookings"
                  element={
                    <Bookings />
                  }
                />

                <Route
                  path="/users"
                  element={
                    <Users />
                  }
                />

                <Route
                  path="/managers"
                  element={
                    <Users
                      key="managers"
                      kind="managers"
                      title="Menejerlar"
                      roleFilter="manager"
                    />
                  }
                />

                <Route
                  path="/registers"
                  element={
                    <Users
                      key="registers"
                      kind="registers"
                      title="Register"
                      roleFilter="register"
                    />
                  }
                />

                <Route
                  path="/payments"
                  element={
                    <Payments />
                  }
                />

                <Route
                  path="/reviews"
                  element={
                    <Reviews />
                  }
                />

                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/"
                      replace
                    />
                  }
                />
              </Routes>
            </Layout>
          </Protected>
        }
      />
    </Routes>
  );
}