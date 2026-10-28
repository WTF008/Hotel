from rest_framework import serializers
from .models import Review


class ReviewSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = Review
        fields = "__all__"
        read_only_fields = ("user",)

    def validate_rating(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("Rating 1 dan 5 gacha bo‘lishi kerak.")
        return value

    def validate(self, attrs):
        request = self.context.get("request")
        user = request.user if request else None
        if not user or not user.is_authenticated:
            raise serializers.ValidationError("Sharh yozish uchun tizimga kiring.")

        booking = attrs.get("booking")
        if self.instance and booking is None:
            booking = self.instance.booking
        if booking is None:
            room = attrs.get("room")
            if not room:
                raise serializers.ValidationError({"room": "Xona majburiy."})
            booking = (
                user.bookings.filter(room=room, status="checked_out")
                .exclude(review__isnull=False)
                .order_by("-check_out")
                .first()
            )
            if not booking:
                raise serializers.ValidationError("Sharh faqat check-out qilingan bron uchun yoziladi.")
            attrs["booking"] = booking

        if booking.user_id != user.id and user.role not in {"admin", "manager"}:
            raise serializers.ValidationError("Bu bron sizga tegishli emas.")
        if booking.status != "checked_out" and user.role not in {"admin", "manager"}:
            raise serializers.ValidationError("Sharh faqat check-out qilingandan keyin yoziladi.")
        if "room" in attrs and attrs["room"].pk != booking.room_id:
            raise serializers.ValidationError({"room": "Review xonasi booking xonasi bilan mos kelishi kerak."})
        attrs["room"] = booking.room
        return attrs
