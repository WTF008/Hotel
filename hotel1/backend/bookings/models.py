from django.db import models
from django.conf import settings
from rooms.models import Room


class Booking(models.Model):
    STATUS = (
        ("pending", "Pending"),
        ("confirmed", "Confirmed"),
        ("checked_in", "Checked in"),
        ("checked_out", "Checked out"),
        ("cancelled", "Cancelled"),
    )
    PAYMENT = (("unpaid", "Unpaid"), ("partial", "Partial"), ("paid", "Paid"), ("refunded", "Refunded"))

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bookings")
    room = models.ForeignKey(Room, on_delete=models.PROTECT, related_name="bookings")
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.PositiveIntegerField(default=1)
    # Booking yaratilgan paytdagi tarifni saqlaydi. Keyinchalik RoomType narxi o'zgarsa,
    # eski bronning summasi o'zgarmaydi.
    nightly_rate = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS, default="pending")
    payment_status = models.CharField(max_length=20, choices=PAYMENT, default="unpaid")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"#{self.pk} — {self.room.number} — {self.user.username}"
