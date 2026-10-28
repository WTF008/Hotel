import React, { useEffect, useState } from "react";
import { Routes, Route, Link, Navigate, useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import api from "./api";

const unwrap = (d) => d?.results ?? d ?? [];
const money = (n) => Number(n || 0).toLocaleString("uz-UZ");
const today = () => { const d = new Date(); const pad = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };

// DRF xatolarini (field yoki non_field) bitta matnga aylantiradi
function errText(e, fallback) {
  const d = e?.response?.data;
  if (!d) return fallback;
  if (typeof d === "string") return fallback;
  if (d.detail) return d.detail;
  const first = Object.values(d)[0];
  const msg = Array.isArray(first) ? first[0] : first;
  return typeof msg === "string" ? msg : fallback;
}

function RequireAuth({ children }) {
  return localStorage.getItem("access") ? children : <Navigate to="/login" replace />;
}

function Header() {
  const nav = useNavigate();
  useLocation(); // sahifa almashganda tokenni qayta o'qish uchun
  const token = localStorage.getItem("access");
  return (
    <header>
      <div className="logo">HOTEL<span>.</span></div>
      <nav>
        <Link to="/">Bosh sahifa</Link>
        <Link to="/rooms">Xonalar</Link>
        {token && <Link to="/bookings">Bronlarim</Link>}
      </nav>
      <div className="actions">
        {token ? (
          <button onClick={() => { localStorage.clear(); nav("/"); }}>Chiqish</button>
        ) : (
          <Link className="btn" to="/login">Kirish</Link>
        )}
      </div>
    </header>
  );
}

function SearchBox() {
  const nav = useNavigate();
  const [f, setF] = useState({ check_in: "", check_out: "", guests: 2 });
  const submit = (e) => {
    e.preventDefault();
    const p = new URLSearchParams();
    if (f.check_in || f.check_out) {
      if (!f.check_in || !f.check_out || f.check_out <= f.check_in) {
        alert("Kirish va chiqish sanalarini to‘g‘ri tanlang.");
        return;
      }
      p.set("check_in", f.check_in); p.set("check_out", f.check_out);
    }
    if (f.guests) p.set("guests", f.guests);
    nav(`/rooms?${p.toString()}`);
  };
  return (
    <form className="hero-card" onSubmit={submit}>
      <div className="search-title">Xona qidirish</div>
      <div className="search-grid">
        <label>Kirish<input type="date" min={today()} value={f.check_in} onChange={(e) => setF({ ...f, check_in: e.target.value })} /></label>
        <label>Chiqish<input type="date" min={f.check_in || today()} value={f.check_out} onChange={(e) => setF({ ...f, check_out: e.target.value })} /></label>
        <label>Mehmonlar<input type="number" min="1" value={f.guests} onChange={(e) => setF({ ...f, guests: e.target.value })} /></label>
      </div>
      <button className="primary full">Bo‘sh xonalarni topish</button>
    </form>
  );
}

function Home() {
  const [rooms, setRooms] = useState([]);
  useEffect(() => { api.get("rooms/").then((r) => setRooms(unwrap(r.data))).catch(() => {}); }, []);
  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">PREMIUM STAY</p>
          <h1>Qulaylikni <br /><span>yangi darajada</span> his qiling.</h1>
          <p className="lead">Siz uchun eng yaxshi xonani toping, sanalarni tanlang va bronni bir necha daqiqada yakunlang.</p>
          <Link className="primary" to="/rooms">Xonalarni ko‘rish →</Link>
        </div>
        <SearchBox />
      </section>
      <section className="section">
        <div className="section-head">
          <div><p className="eyebrow">XONALAR</p><h2>Tanlangan xonalar</h2></div>
          <Link to="/rooms">Barchasini ko‘rish →</Link>
        </div>
        <div className="cards">{rooms.slice(0, 6).map((r) => <RoomCard key={r.id} room={r} />)}</div>
      </section>
    </>
  );
}

function RoomCard({ room, query = "" }) {
  return (
    <article className="room-card">
      <div className="room-img">{room.image ? <img src={room.image} alt={`Xona ${room.number}`} /> : <span>ROOM {room.number}</span>}</div>
      <div className="room-body">
        <div>
          <span className="tag">{room.room_type?.name}</span>
          <h3>{room.number} — {room.room_type?.name}</h3>
        </div>
        <p>{room.description || "Zamonaviy, qulay va toza xona."}</p>
        <strong>{money(room.room_type?.price_per_night)} so‘m <small>/ kecha</small></strong>
        <Link className="secondary" to={`/rooms/${room.id}${query}`}>Batafsil</Link>
      </div>
    </article>
  );
}

function Rooms() {
  const [params] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const qs = params.toString();
  useEffect(() => {
    setLoading(true);
    api.get(`rooms/${qs ? `?${qs}` : ""}`).then((r) => setRooms(unwrap(r.data))).catch(() => setRooms([])).finally(() => setLoading(false));
  }, [qs]);
  const dates = ["check_in", "check_out", "guests"].filter((k) => params.get(k)).map((k) => `${k}=${params.get(k)}`).join("&");
  return (
    <main className="page">
      <p className="eyebrow">ROOMS</p>
      <h1>{params.get("check_in") ? "Tanlangan sanalarda bo‘sh xonalar" : "Barcha xonalar"}</h1>
      {loading ? <p>Yuklanmoqda...</p> : (
        <div className="cards">
          {rooms.map((r) => <RoomCard key={r.id} room={r} query={dates ? `?${dates}` : ""} />)}
          {!rooms.length && <p>Mos xona topilmadi.</p>}
        </div>
      )}
    </main>
  );
}

function RoomDetail() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [room, setRoom] = useState(null);
  const [failed, setFailed] = useState(false);
  const nav = useNavigate();
  useEffect(() => { api.get(`rooms/${id}/`).then((r) => setRoom(r.data)).catch(() => setFailed(true)); }, [id]);
  if (failed) return <main className="page"><p>Xona topilmadi.</p></main>;
  if (!room) return <main className="page"><p>Yuklanmoqda...</p></main>;
  const qs = params.toString();
  return (
    <main className="page detail">
      <div className="detail-img">{room.image ? <img src={room.image} alt={`Xona ${room.number}`} /> : `ROOM ${room.number}`}</div>
      <div>
        <p className="eyebrow">{room.room_type?.name}</p>
        <h1>{room.number}</h1>
        <p>{room.description || "Premium mehmonxona xonasi."}</p>
        <h2>{money(room.room_type?.price_per_night)} so‘m / kecha</h2>
        <button className="primary" disabled={room.status === "maintenance"}
          onClick={() => nav(localStorage.getItem("access") ? `/book/${room.id}${qs ? `?${qs}` : ""}` : "/login")}>
          {room.status === "maintenance" ? "Texnik xizmatda" : "Bron qilish"}
        </button>
      </div>
    </main>
  );
}

function Auth({ title, children }) {
  return (
    <main className="auth"><div className="auth-box"><p className="eyebrow">HOTEL BOOKING</p><h1>{title}</h1>{children}</div></main>
  );
}

function Login() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const r = await api.post("auth/login/", { username: login.trim(), password });
      localStorage.setItem("access", r.data.access);
      localStorage.setItem("refresh", r.data.refresh);
      localStorage.setItem("user", JSON.stringify(r.data.user));
      nav("/");
    } catch (err) {
      setError(err.response?.status === 401 ? "Login yoki parol noto‘g‘ri" : "Serverga ulanib bo‘lmadi");
    }
  };
  return (
    <Auth title="Tizimga kirish">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        <input required placeholder="Username yoki email" value={login} onChange={(e) => setLogin(e.target.value)} />
        <input required type="password" placeholder="Parol" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className="primary full">Kirish</button>
      </form>
      <p>Akkauntingiz yo‘qmi? <Link to="/register">Ro‘yxatdan o‘ting</Link></p>
    </Auth>
  );
}

const REG_FIELDS = [
  ["username", "Username"], ["email", "Email"], ["first_name", "Ism"], ["last_name", "Familiya"], ["password", "Parol (kamida 8 belgi)"],
];

function Register() {
  const [f, setF] = useState({ username: "", email: "", password: "", first_name: "", last_name: "" });
  const [error, setError] = useState("");
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.post("auth/register/", f);
      nav("/login");
    } catch (err) {
      setError(errText(err, "Ma’lumotlarni tekshiring"));
    }
  };
  return (
    <Auth title="Ro‘yxatdan o‘tish">
      <form onSubmit={submit}>
        {error && <div className="error">{error}</div>}
        {REG_FIELDS.map(([k, label]) => (
          <input key={k} required={k !== "first_name" && k !== "last_name"} type={k === "password" ? "password" : k === "email" ? "email" : "text"}
            placeholder={label} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        ))}
        <button className="primary full">Akkaunt yaratish</button>
      </form>
    </Auth>
  );
}

function Book() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [data, setData] = useState({
    room: id, check_in: params.get("check_in") || "", check_out: params.get("check_out") || "", guests: params.get("guests") || 2,
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("bookings/", { ...data, guests: Number(data.guests) });
      nav("/bookings");
    } catch (err) {
      setError(errText(err, "Bron yaratilmadi"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <main className="page">
      <div className="form-card">
        <p className="eyebrow">RESERVATION</p>
        <h1>Xonani bron qilish</h1>
        <form onSubmit={submit}>
          {error && <div className="error">{error}</div>}
          <label>Kirish<input type="date" required min={today()} value={data.check_in} onChange={(e) => setData({ ...data, check_in: e.target.value })} /></label>
          <label>Chiqish<input type="date" required min={data.check_in || today()} value={data.check_out} onChange={(e) => setData({ ...data, check_out: e.target.value })} /></label>
          <label>Mehmonlar<input type="number" min="1" required value={data.guests} onChange={(e) => setData({ ...data, guests: e.target.value })} /></label>
          <button className="primary" disabled={busy}>{busy ? "Yuborilmoqda..." : "Bronni tasdiqlash"}</button>
        </form>
      </div>
    </main>
  );
}

function Bookings() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = () =>
    api.get("bookings/").then((r) => setItems(unwrap(r.data))).catch(() => setError("Bronlarni yuklab bo‘lmadi")).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);
  const cancel = async (id) => {
    if (!confirm("Bronni bekor qilasizmi?")) return;
    try { await api.post(`bookings/${id}/cancel/`); load(); } catch (err) { setError(errText(err, "Bekor qilib bo‘lmadi")); }
  };
  return (
    <main className="page">
      <p className="eyebrow">MY BOOKINGS</p>
      <h1>Mening bronlarim</h1>
      {error && <div className="error">{error}</div>}
      <div className="table">
        {items.map((b) => (
          <div className="row" key={b.id}>
            <b>#{b.id} · {b.room_number}</b>
            <span>{b.check_in} → {b.check_out}</span>
            <span>{money(b.total_price)} so‘m</span>
            <span><span className="tag">{b.status}</span>{["pending", "confirmed"].includes(b.status) && <button className="link-btn" onClick={() => cancel(b.id)}>Bekor qilish</button>}</span>
          </div>
        ))}
        {!loading && !items.length && <p style={{ padding: 22 }}>Hozircha bronlar mavjud emas.</p>}
      </div>
    </main>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/rooms" element={<Rooms />} />
        <Route path="/rooms/:id" element={<RoomDetail />} />
        <Route path="/book/:id" element={<RequireAuth><Book /></RequireAuth>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bookings" element={<RequireAuth><Bookings /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <footer>© 2026 HOTEL. Barcha huquqlar himoyalangan.</footer>
    </>
  );
}


