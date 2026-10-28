# HOTEL BOOKING — Full Stack

Bu paketda asosiy sayt, alohida Admin Panel va Django REST API mavjud.

## Rollar
- **admin** — barcha CRUD, foydalanuvchilar, menejerlar, register, xonalar, bronlar, to‘lovlar, sharhlar va dashboard.
- **manager** — xonalar, xona turlari, bronlar, to‘lovlar va sharhlar.
- **register** — bronlarni ko‘rish/boshqarish, check-in/check-out va to‘lovlar.
- **user** — sayt orqali ro‘yxatdan o‘tadi, xona ko‘radi, bron qiladi va o‘z sharhlarini qoldiradi.

## Ishga tushirish

### 1. Backend
```powershell
cd backend
python -m venv env
.\env\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```
Backend: `http://127.0.0.1:8000/`
Django admin: `http://127.0.0.1:8000/admin/`

### 2. Asosiy frontend
Yangi terminal:
```powershell
cd frontend
npm install
npm run dev
```
Asosiy sayt: `http://localhost:5173/`

### 3. Alohida Admin Panel
Yangi terminal:
```powershell
cd admin-panel
npm install
npm run dev
```
Admin panel: `http://localhost:5174/`

> `.env` faylida `SECRET_KEY` ni o‘zgartiring. Ishlab chiqarishda (`DEBUG=False`) `SECRET_KEY`, `ALLOWED_HOSTS` va `CORS_ALLOWED_ORIGINS` majburiy sozlanadi.
> Frontend API manzilini o‘zgartirish uchun `frontend/.env` va `admin-panel/.env` ichida `VITE_API_URL=http://127.0.0.1:8000/api/` yozing.

## Demo loginlar
- Admin: `admin` / `Admin123!`
- Manager: `manager` / `Manager123!`
- Register: `register` / `Register123!`
- User: `user` / `User123!`

Login uchun username **yoki email** ishlaydi. Yangi parollar kamida 8 belgi bo‘lishi kerak.
`seed_demo` ni qayta ishga tushirish mavjud foydalanuvchi parollarini va admin kiritgan ma’lumotlarni o‘zgartirmaydi.

## Admin panel funksiyalari
- Dashboard KPI va daromad
- Xonalar CRUD + filter/qidiruv/status
- Xona turlari CRUD
- Bronlar: tasdiqlash, check-in, check-out, bekor qilish
- Foydalanuvchilar CRUD
- Menejerlar CRUD
- Register xodimlari CRUD
- To‘lovlar CRUD
- Sharhlar ko‘rish/o‘chirish
- JWT authentication

## Muhim
`8000` — backend, `5173` — asosiy sayt, `5174` — admin panel.
Backend ishlayotgan terminalni yopmang.

## Tuzatishlar
Topilgan va tuzatilgan xatolar ro‘yxati: `XATOLAR_HISOBOTI.md`.
