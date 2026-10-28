# Tuzatilgan xatolar hisoboti

Loyiha: Django REST + React/Vite + Admin Panel.

## Tuzatilgan asosiy muammolar

- Booking statuslari uchun qat'iy transitionlar: `pending → confirmed → checked_in → checked_out`, cancel faqat `pending/confirmed` holatlarda.
- Check-in bronning `check_in` sanasidan oldin bajarilmaydi.
- Check-in/check-out xona statusini avtomatik sinxronlaydi.
- Xonani qo‘lda `occupied/available/maintenance` qilish biznes qoidalari bilan cheklangan.
- Xona qidiruvida noto‘g‘ri query parametrlar 400 qaytaradi.
- Sana bo‘yicha room availability overlap bilan tekshiriladi.
- Booking yaratish va yangilashda `select_for_update()` orqali race condition kamaytirilgan.
- Booking narxi bron yaratilgan paytdagi `nightly_rate` snapshot orqali saqlanadi.
- To‘lovlar 0/manfiy bo‘lishi mumkin emas.
- Paid to‘lov booking summasidan oshib ketolmaydi.
- Refund faqat mavjud paid summadan va refundable balansdan oshmaydi.
- Mavjud payment boshqa booking'ga ko‘chirilmaydi.
- Paid/refunded payment o‘chirib yuborilmaydi.
- Bookinglar payment mavjud bo‘lsa yoki yakunlangan bo‘lsa o‘chirib yuborilmaydi.
- Userda booking bo‘lsa, accountni o‘chirishga ruxsat berilmaydi; deactivate qilish kerak.
- Review faqat check-out qilingan booking asosida yoziladi.
- Bir booking uchun bir nechta review yaratish bloklangan.
- Review ownership va moderator huquqlari tekshiriladi.
- `/me/` orqali role/is_active/username o‘zgartirish yopiq.
- Admin o‘zini adminlikdan tushira yoki o‘chira olmaydi.
- Demo secret va `node_modules`, virtualenv, local database ZIP paketiga kiritilmaydi.
- Frontend local date UTC xatosidan himoyalangan.
- Search form sanalari frontendda ham tekshiriladi.
- Admin panel xona statusini maxsus status endpoint orqali o‘zgartiradi.

## Paket tarkibi

ZIP ichida `node_modules/`, virtualenv, `.env` va local `db.sqlite3` yo‘q. Ishga tushirishdan oldin:

```powershell
cd frontend
npm install
npm run dev
```

```powershell
cd admin-panel
npm install
npm run dev
```

Backend:

```powershell
cd backend
python -m venv env
env\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Productionda `.env` ichida haqiqiy `SECRET_KEY`, `ALLOWED_HOSTS`, DB va CORS qiymatlarini qo‘yish kerak.
