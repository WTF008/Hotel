from django.db import transaction
from django.db.models import Sum
from rest_framework import viewsets
from .models import Payment
from .serializers import PaymentSerializer
from .permissions import PaymentAccess


def recalc_booking_payment(booking):
    sums = {row["status"]: row["s"] or 0 for row in booking.payments.values("status").annotate(s=Sum("amount"))}
    paid, refunded = sums.get("paid", 0), sums.get("refunded", 0)
    net = paid - refunded
    if refunded > 0 and net <= 0:
        value = "refunded"
    elif net >= booking.total_price and net > 0:
        value = "paid"
    elif net > 0:
        value = "partial"
    else:
        value = "unpaid"
    if booking.payment_status != value:
        booking.payment_status = value
        booking.save(update_fields=["payment_status"])


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("booking", "booking__user", "booking__room").all()
    serializer_class = PaymentSerializer
    permission_classes = [PaymentAccess]

    @transaction.atomic
    def perform_create(self, serializer):
        payment = serializer.save(created_by=self.request.user)
        recalc_booking_payment(payment.booking)

    @transaction.atomic
    def perform_update(self, serializer):
        old_booking = serializer.instance.booking
        payment = serializer.save()
        recalc_booking_payment(payment.booking)
        if old_booking.pk != payment.booking.pk:
            recalc_booking_payment(old_booking)

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.status != "pending":
            from rest_framework.response import Response
            from rest_framework import status
            return Response({"detail": "Paid/refunded to‘lovni o‘chirib bo‘lmaydi. Tuzatish uchun yangi correction/refund operatsiyasi yarating."}, status=status.HTTP_409_CONFLICT)
        return super().destroy(request, *args, **kwargs)

    def perform_destroy(self, instance):
        booking = instance.booking
        instance.delete()
        recalc_booking_payment(booking)
