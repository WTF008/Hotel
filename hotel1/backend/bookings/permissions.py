from rest_framework.permissions import BasePermission

STAFF_ROLES = {"admin", "manager", "register"}


def is_staff_role(user):
    return bool(user and user.is_authenticated and user.role in STAFF_ROLES)


class BookingAccess(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if is_staff_role(request.user):
            return True
        # Oddiy foydalanuvchi: faqat o'z broni; o'chirish yo'q (bekor qilish uchun /cancel/ bor)
        return obj.user_id == request.user.id and request.method in ("GET", "HEAD", "OPTIONS", "PATCH", "PUT", "POST")
