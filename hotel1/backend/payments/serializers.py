from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers
from .models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    booking_number = serializers.IntegerField(source="booking.id", read_only=True)
    customer = serializers.CharField(source="booking.user.username", read_only=True)
    room_number = serializers.CharField(source="booking.room.number", read_only=True)

    class Meta:
        model = Payment
        fields = "__all__"
        read_only_fields = ("created_by", "created_at")

    def validate_amount(self, value):
        if value <= 0:
            raise serializers.ValidationError("Summa 0 dan katta bo‘lishi kerak.")
        return value

    def validate(self, attrs):
        submitted_booking = attrs.get("booking")
        if self.instance and submitted_booking is not None and submitted_booking.pk != self.instance.booking_id:
            raise serializers.ValidationError({"booking": "Mavjud to‘lovni boshqa bron bilan bog‘lab bo‘lmaydi."})
        booking = submitted_booking or (self.instance.booking if self.instance else None)
        status = attrs.get("status", self.instance.status if self.instance else "paid")
        amount = attrs.get("amount", self.instance.amount if self.instance else None)

        if not booking:
            raise serializers.ValidationError({"booking": "Bron majburiy."})
        if booking.status == "cancelled" and status != "refunded":
            raise serializers.ValidationError("Bekor qilingan bron uchun faqat refund operatsiyasi mumkin.")
        if booking.status == "cancelled" and status == "refunded":
            # Cancel qilingan bronni refund qilish mumkin, lekin real paid summadan oshmasin.
            pass

        existing = booking.payments.all()
        if self.instance:
            existing = existing.exclude(pk=self.instance.pk)

        paid = existing.filter(status="paid").aggregate(total=Sum("amount"))["total"] or Decimal("0")
        refunded = existing.filter(status="refunded").aggregate(total=Sum("amount"))["total"] or Decimal("0")

        if status == "paid" and paid - refunded + amount > booking.total_price:
            raise serializers.ValidationError({"amount": "To‘lov booking summasidan oshib ketishi mumkin emas."})

        if status == "refunded":
            refundable = paid - refunded
            if amount > refundable:
                raise serializers.ValidationError({"amount": f"Refund qilinadigan summa {refundable} dan oshmasligi kerak."})
            if refundable <= 0:
                raise serializers.ValidationError("Refund qilish uchun avval paid to‘lov bo‘lishi kerak.")

        return attrs
