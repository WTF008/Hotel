from django.db import models
from django.conf import settings
from rooms.models import Room
from bookings.models import Booking


class Review(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="reviews")
    # Bir review real checkout qilingan bron bilan bog'lanadi.
    booking = models.ForeignKey(Booking, on_delete=models.SET_NULL, null=True, blank=True, related_name="review")
    rating = models.PositiveSmallIntegerField()
    comment = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(fields=["booking"], name="unique_review_per_booking"),
        ]
