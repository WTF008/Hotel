from django.db.models import Sum
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rooms.models import Room
from bookings.models import Booking
from payments.models import Payment
from users.models import User


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if request.user.role not in {"admin", "manager", "register"}:
            return Response({"detail": "Ruxsat yo‘q."}, status=403)
        paid = Payment.objects.filter(status="paid").aggregate(total=Sum("amount"))["total"] or 0
        refunded = Payment.objects.filter(status="refunded").aggregate(total=Sum("amount"))["total"] or 0
        return Response({
            "rooms_total": Room.objects.count(),
            "rooms_available": Room.objects.filter(status="available").count(),
            "rooms_occupied": Room.objects.filter(status="occupied").count(),
            "rooms_maintenance": Room.objects.filter(status="maintenance").count(),
            "bookings_total": Booking.objects.count(),
            "pending_bookings": Booking.objects.filter(status="pending").count(),
            "confirmed_bookings": Booking.objects.filter(status="confirmed").count(),
            "users_total": User.objects.count(),
            "revenue": paid - refunded,
        })
