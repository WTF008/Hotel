from datetime import date

from django.db import transaction
from django.db.models import Count, Q, ProtectedError
from django.utils import timezone

from rest_framework import viewsets, permissions, status as http
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response

from bookings.models import Booking

from .models import RoomType, Room, RoomImage
from .serializers import (
    RoomTypeSerializer,
    RoomSerializer,
    RoomImageSerializer,
)
from .permissions import IsAdminOrManager


WRITE_METHODS = (
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
)


class ProtectedDeleteMixin:
    protected_message = (
        "Bu obyekt boshqa yozuvlar bilan bog‘langan, "
        "o‘chirib bo‘lmaydi."
    )

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(
                request,
                *args,
                **kwargs,
            )

        except ProtectedError:
            return Response(
                {
                    "detail": self.protected_message
                },
                status=http.HTTP_409_CONFLICT,
            )


class RoomTypeViewSet(
    ProtectedDeleteMixin,
    viewsets.ModelViewSet,
):
    queryset = (
        RoomType.objects
        .annotate(
            room_count=Count("rooms")
        )
        .order_by("id")
    )

    serializer_class = RoomTypeSerializer

    protected_message = (
        "Bu turdagi xonalar mavjud. "
        "Avval xonalarni o‘chiring yoki "
        "boshqa turga o‘tkazing."
    )

    def get_permissions(self):
        if self.request.method in WRITE_METHODS:
            return [IsAdminOrManager()]

        return [permissions.AllowAny()]


class RoomViewSet(
    ProtectedDeleteMixin,
    viewsets.ModelViewSet,
):
    serializer_class = RoomSerializer

    protected_message = (
        "Bu xonada bronlar mavjud, "
        "o‘chirib bo‘lmaydi. "
        "Uni 'Ta’mirda' holatiga o‘tkazing."
    )

    def get_queryset(self):
        params = self.request.query_params

        qs = (
            Room.objects
            .select_related("room_type")
            .prefetch_related("images")
            .order_by("number")
        )

        room_type = params.get("room_type")

        if room_type:
            if (
                not room_type.isdigit()
                or int(room_type) < 1
            ):
                raise ValidationError(
                    {
                        "room_type":
                        "room_type musbat butun son "
                        "bo‘lishi kerak."
                    }
                )

            qs = qs.filter(
                room_type_id=int(room_type)
            )

        floor = params.get("floor")

        if floor:
            if (
                not floor.isdigit()
                or int(floor) < 1
            ):
                raise ValidationError(
                    {
                        "floor":
                        "floor musbat butun son "
                        "bo‘lishi kerak."
                    }
                )

            qs = qs.filter(
                floor=int(floor)
            )

        st = params.get("status")

        if st:
            if st not in dict(Room.STATUS):
                raise ValidationError(
                    {
                        "status":
                        "Noto‘g‘ri xona statusi."
                    }
                )

            qs = qs.filter(
                status=st
            )

        q = params.get("q")

        if q:
            qs = qs.filter(
                Q(number__icontains=q)
                |
                Q(description__icontains=q)
                |
                Q(
                    room_type__name__icontains=q
                )
            )

        check_in_raw = params.get(
            "check_in"
        )

        check_out_raw = params.get(
            "check_out"
        )

        if bool(check_in_raw) != bool(
            check_out_raw
        ):
            raise ValidationError(
                {
                    "detail":
                    "check_in va check_out "
                    "ikkalasi ham berilishi kerak."
                }
            )

        if check_in_raw and check_out_raw:
            try:
                ci = date.fromisoformat(
                    check_in_raw
                )

                co = date.fromisoformat(
                    check_out_raw
                )

            except ValueError:
                raise ValidationError(
                    {
                        "detail":
                        "Sanalar YYYY-MM-DD "
                        "formatida bo‘lishi kerak."
                    }
                )

            if co <= ci:
                raise ValidationError(
                    {
                        "detail":
                        "check_out check_in "
                        "sanasidan keyin "
                        "bo‘lishi kerak."
                    }
                )

            if ci < timezone.localdate():
                raise ValidationError(
                    {
                        "detail":
                        "O‘tgan sana uchun "
                        "xona qidirib bo‘lmaydi."
                    }
                )

            busy = (
                Booking.objects
                .filter(
                    status__in=(
                        "pending",
                        "confirmed",
                        "checked_in",
                    ),
                    check_in__lt=co,
                    check_out__gt=ci,
                )
                .values("room_id")
            )

            qs = (
                qs
                .exclude(
                    status="maintenance"
                )
                .exclude(
                    id__in=busy
                )
            )

        guests = params.get("guests")

        if guests:
            if (
                not guests.isdigit()
                or int(guests) < 1
            ):
                raise ValidationError(
                    {
                        "guests":
                        "guests kamida 1 "
                        "bo‘lishi kerak."
                    }
                )

            qs = qs.filter(
                room_type__capacity__gte=int(
                    guests
                )
            )

        return qs

    def get_permissions(self):
        if self.request.method in WRITE_METHODS:
            return [IsAdminOrManager()]

        return [permissions.AllowAny()]

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAdminOrManager],
    )
    def status(self, request, pk=None):

        with transaction.atomic():

            room = (
                Room.objects
                .select_for_update()
                .get(pk=pk)
            )

            value = request.data.get(
                "status"
            )

            if value not in dict(Room.STATUS):
                return Response(
                    {
                        "detail":
                        "Noto‘g‘ri status."
                    },
                    status=http.HTTP_400_BAD_REQUEST,
                )

            checked_in = (
                Booking.objects
                .filter(
                    room_id=room.pk,
                    status="checked_in",
                )
                .exists()
            )

            active_booking = (
                Booking.objects
                .filter(
                    room_id=room.pk,
                    status__in=(
                        "pending",
                        "confirmed",
                        "checked_in",
                    ),
                )
                .exists()
            )

            if (
                value == "occupied"
                and not checked_in
            ):
                return Response(
                    {
                        "detail":
                        "Occupied status faqat "
                        "check-in qilingan xona "
                        "uchun qo‘yiladi."
                    },
                    status=http.HTTP_409_CONFLICT,
                )

            if (
                value == "available"
                and checked_in
            ):
                return Response(
                    {
                        "detail":
                        "Check-in qilingan xonani "
                        "qo‘lda available qilib "
                        "bo‘lmaydi. Avval "
                        "check-out qiling."
                    },
                    status=http.HTTP_409_CONFLICT,
                )

            if (
                value == "maintenance"
                and checked_in
            ):
                return Response(
                    {
                        "detail":
                        "Check-in qilingan xonani "
                        "texnik xizmatga o‘tkazib "
                        "bo‘lmaydi."
                    },
                    status=http.HTTP_409_CONFLICT,
                )

            if (
                value == "maintenance"
                and active_booking
            ):
                return Response(
                    {
                        "detail":
                        "Faol bron mavjud xonani "
                        "texnik xizmatga o‘tkazish "
                        "mumkin emas."
                    },
                    status=http.HTTP_409_CONFLICT,
                )

            room.status = value

            room.save(
                update_fields=["status"]
            )

        return Response(
            RoomSerializer(
                room,
                context={
                    "request": request
                },
            ).data
        )

    @action(
        detail=True,
        methods=["post"],
        permission_classes=[IsAdminOrManager],
        parser_classes=[
            MultiPartParser,
            FormParser,
        ],
    )
    def upload_images(
        self,
        request,
        pk=None,
    ):
        room = self.get_object()

        files = request.FILES.getlist(
            "images"
        )

        if not files:
            return Response(
                {
                    "detail":
                    "Kamida bitta rasm yuboring."
                },
                status=http.HTTP_400_BAD_REQUEST,
            )

        created = []

        for file in files:
            image = RoomImage.objects.create(
                room=room,
                image=file,
            )

            created.append(image)

        return Response(
            {
                "detail":
                f"{len(created)} ta rasm yuklandi.",
                "images":
                RoomImageSerializer(
                    created,
                    many=True,
                    context={
                        "request": request
                    },
                ).data,
            },
            status=http.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"images/(?P<image_id>[^/.]+)",
        permission_classes=[IsAdminOrManager],
    )
    def delete_image(
        self,
        request,
        pk=None,
        image_id=None,
    ):
        room = self.get_object()

        try:
            image = RoomImage.objects.get(
                id=image_id,
                room=room,
            )

        except RoomImage.DoesNotExist:
            return Response(
                {
                    "detail":
                    "Rasm topilmadi."
                },
                status=http.HTTP_404_NOT_FOUND,
            )

        image.delete()

        return Response(
            {
                "detail":
                "Rasm o‘chirildi."
            },
            status=http.HTTP_204_NO_CONTENT,
        )
