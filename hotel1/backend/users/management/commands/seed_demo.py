from django.core.management.base import BaseCommand
from users.models import User
from rooms.models import RoomType, Room


class Command(BaseCommand):
    help = "Create demo users, room types and rooms (faqat yo'q bo'lsa yaratadi, mavjudini o'zgartirmaydi)."

    def handle(self, *args, **kwargs):
        accounts = [
            ("admin@hotel.uz", "admin", "Admin123!", "admin"),
            ("manager@hotel.uz", "manager", "Manager123!", "manager"),
            ("register@hotel.uz", "register", "Register123!", "register"),
            ("user@hotel.uz", "user", "User123!", "user"),
        ]
        for email, username, password, role in accounts:
            u, created = User.objects.get_or_create(
                username=username, defaults={"email": email, "role": role, "is_active": True}
            )
            if created:
                # Parol faqat birinchi yaratilganda o'rnatiladi (qayta ishga tushirsa parol/rol qayta yozilmaydi)
                if role == "admin":
                    u.is_staff = True
                    u.is_superuser = True
                u.set_password(password)
                u.save()

        types = [
            ("Standard", "Qulay standart xona", 2, 450000, ["Wi-Fi", "TV", "Nonushta"]),
            ("Deluxe", "Premium xona", 2, 850000, ["Wi-Fi", "TV", "Mini bar", "Nonushta"]),
            ("Suite", "Keng suite xona", 4, 1300000, ["Wi-Fi", "TV", "Mini bar", "SPA", "Nonushta"]),
        ]
        for idx, (name, desc, cap, price, amenities) in enumerate(types, 1):
            rt, _ = RoomType.objects.get_or_create(
                name=name,
                defaults={"description": desc, "capacity": cap, "price_per_night": price, "amenities": amenities},
            )
            for i in range(1, 4):
                Room.objects.get_or_create(number=f"{idx}0{i}", defaults={"floor": idx, "room_type": rt})
        self.stdout.write(self.style.SUCCESS(
            "Demo ma’lumotlar tayyor: admin/Admin123!, manager/Manager123!, register/Register123!, user/User123!"
        ))
