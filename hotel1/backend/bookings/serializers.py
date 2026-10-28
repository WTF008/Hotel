from decimal import Decimal
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import Booking
from rooms.models import Room

ACTIVE = ("pending", "confirmed", "checked_in")


class BookingSerializer(serializers.ModelSerializer):
    room_number = serializers.CharField(source="room.number", read_only=True)
    room_type = serializers.CharField(source="room.room_type.name", read_only=True)
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Booking
        fields = (
            "id", "user", "user_name", "room", "room_number", "room_type",
            "check_in", "check_out", "guests", "nightly_rate", "total_price",
            "status", "payment_status", "created_at",
        )
        read_only_fields = ("user", "nightly_rate", "total_price", "status", "payment_status", "created_at")
        extra_kwargs = {"guests": {"min_value": 1}}

    def _check(self, attrs, instance=None, *, locked_room=None):
        check_in = attrs.get("check_in", instance.check_in if instance else None)
        check_out = attrs.get("check_out", instance.check_out if instance else None)
        room = locked_room or attrs.get("room", instance.room if instance else None)
        guests = attrs.get("guests", instance.guests if instance else 1)

        if not check_in or not check_out or not room:
            raise serializers.ValidationError("Xona va kirish/chiqish sanalari majburiy.")
        if check_out <= check_in:
            raise serializers.ValidationError("Chiqish sanasi kirish sanasidan keyin bo‘lishi kerak.")
        if check_in < timezone.localdate():
            raise serializers.ValidationError("O‘tgan sana uchun bron qilib bo‘lmaydi.")
        if room.status == "maintenance":
            raise serializers.ValidationError("Bu xona texnik xizmatda.")
        if guests > room.room_type.capacity:
            raise serializers.ValidationError("Mehmonlar soni xona sig‘imidan oshib ketdi.")

        overlap = Booking.objects.filter(
            room=room,
            status__in=ACTIVE,
            check_in__lt=check_out,
            check_out__gt=check_in,
        )
        if instance:
            overlap = overlap.exclude(pk=instance.pk)
        if overlap.exists():
            raise serializers.ValidationError("Tanlangan sanalarda xona band.")

    def validate(self, attrs):
        self._check(attrs, self.instance)
        return attrs

    @staticmethod
    def _total(room, check_in, check_out, nightly_rate=None):
        rate = nightly_rate if nightly_rate is not None else room.room_type.price_per_night
        return Decimal((check_out - check_in).days) * rate

    def create(self, validated_data):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated:
            raise serializers.ValidationError("Bron yaratish uchun tizimga kiring.")

        with transaction.atomic():
            room = Room.objects.select_for_update().select_related("room_type").get(pk=validated_data["room"].pk)
            self._check(validated_data, locked_room=room)
            validated_data["user"] = request.user
            validated_data["nightly_rate"] = room.room_type.price_per_night
            validated_data["total_price"] = self._total(
                room, validated_data["check_in"], validated_data["check_out"], validated_data["nightly_rate"]
            )
            return Booking.objects.create(**validated_data)

    def update(self, instance, validated_data):
        if instance.status not in ("pending", "confirmed"):
            raise serializers.ValidationError("Faqat pending yoki confirmed bronni tahrirlash mumkin.")
        if instance.payment_status in ("paid", "refunded") and any(k in validated_data for k in ("room", "check_in", "check_out")):
            raise serializers.ValidationError("To‘lov yakunlangan bronning xona yoki sanalarini o‘zgartirib bo‘lmaydi.")

        with transaction.atomic():
            room_id = validated_data.get("room", instance.room).pk
            room = Room.objects.select_for_update().select_related("room_type").get(pk=room_id)
            self._check(validated_data, instance, locked_room=room)
            ci = validated_data.get("check_in", instance.check_in)
            co = validated_data.get("check_out", instance.check_out)
            validated_data["nightly_rate"] = instance.nightly_rate or room.room_type.price_per_night
            validated_data["total_price"] = self._total(room, ci, co, validated_data["nightly_rate"])
            return super().update(instance, validated_data)
