from django.db import transaction
from django.utils import timezone
from rest_framework import status as http
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from .models import Booking
from .serializers import BookingSerializer
from .permissions import BookingAccess, is_staff_role
from rooms.models import Room

TRANSITIONS = {
    "confirm": (("pending",), "confirmed"),
    "check_in": (("confirmed",), "checked_in"),
    "check_out": (("checked_in",), "checked_out"),
    "cancel": (("pending", "confirmed"), "cancelled"),
}


class BookingViewSet(viewsets.ModelViewSet):
    serializer_class = BookingSerializer
    permission_classes = [BookingAccess]
    http_method_names = ["get", "post", "patch", "put", "delete", "head", "options"]

    def get_queryset(self):
        qs = Booking.objects.select_related("room", "room__room_type", "user")
        user = self.request.user
        if not is_staff_role(user):
            qs = qs.filter(user=user)
        value = self.request.query_params.get("status")
        if value:
            allowed = {key for key, _ in Booking.STATUS}
            if value not in allowed:
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"status": "Noto‘g‘ri booking status."})
            qs = qs.filter(status=value)
        return qs

    def perform_update(self, serializer):
        if serializer.instance.status not in ("pending", "confirmed"):
            raise PermissionDenied("Faqat pending yoki confirmed bronni o‘zgartirish mumkin.")
        if not is_staff_role(self.request.user) and serializer.instance.status != "pending":
            raise PermissionDenied("Tasdiqlangan bronni faqat xodim o‘zgartirishi mumkin.")
        serializer.save()

    def destroy(self, request, *args, **kwargs):
        if not is_staff_role(request.user):
            raise PermissionDenied("Bronni o‘chirib bo‘lmaydi, uni bekor qiling.")
        obj = self.get_object()
        if obj.status != "pending" or obj.payments.exists():
            return Response(
                {"detail": "Faqat to‘lovsiz pending bronni o‘chirish mumkin. Boshqa bronni bekor qiling."},
                status=http.HTTP_409_CONFLICT,
            )
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"])
    def confirm(self, request, pk=None):
        return self._transition(request, "confirm")

    @action(detail=True, methods=["post"])
    def check_in(self, request, pk=None):
        return self._transition(request, "check_in")

    @action(detail=True, methods=["post"])
    def check_out(self, request, pk=None):
        return self._transition(request, "check_out")

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        return self._transition(request, "cancel")

    def _transition(self, request, name):
        if not is_staff_role(request.user) and name != "cancel":
            return Response({"detail": "Ruxsat yo‘q."}, status=http.HTTP_403_FORBIDDEN)

        allowed_from, new_status = TRANSITIONS[name]
        with transaction.atomic():
            obj = self.get_object()
            if obj.status not in allowed_from:
                return Response({"detail": f"'{obj.status}' holatidagi bronda bu amalni bajarib bo‘lmaydi."}, status=http.HTTP_400_BAD_REQUEST)

            today = timezone.localdate()
            if name == "check_in" and obj.check_in > today:
                return Response(
                    {"detail": f"Check-in {obj.check_in} sanasidan oldin bajarilmaydi."},
                    status=http.HTTP_400_BAD_REQUEST,
                )

            room = Room.objects.select_for_update().get(pk=obj.room_id)
            if name == "check_in":
                if room.status == "maintenance":
                    return Response({"detail": "Bu xona texnik xizmatda."}, status=http.HTTP_409_CONFLICT)
                # Xonada boshqa real check-in bo‘lsa, ikki mehmonni bir xonaga kiritmaymiz.
                conflict = Booking.objects.filter(
                    room_id=room.pk,
                    status="checked_in",
                ).exclude(pk=obj.pk).exists()
                if conflict:
                    return Response({"detail": "Xona hozir boshqa mehmon tomonidan band."}, status=http.HTTP_409_CONFLICT)

            obj.status = new_status
            obj.save(update_fields=["status"])

            if name == "check_in":
                room.status = "occupied"
                room.save(update_fields=["status"])
            elif name == "check_out":
                # Xonada boshqa check-in bo'lmasa, yana available bo'ladi.
                has_other_guest = Booking.objects.filter(room_id=room.pk, status="checked_in").exclude(pk=obj.pk).exists()
                if not has_other_guest:
                    room.status = "available"
                    room.save(update_fields=["status"])

        return Response(self.get_serializer(obj).data)
