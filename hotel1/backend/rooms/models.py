from django.db import models


class RoomType(models.Model):
    name = models.CharField(max_length=100)

    description = models.TextField(
        blank=True,
        null=True,
    )

    price_per_night = models.DecimalField(
        max_digits=12,
        decimal_places=2,
    )

    capacity = models.PositiveIntegerField(
        default=1,
    )

    image = models.ImageField(
        upload_to="room-types/",
        blank=True,
        null=True,
    )

    def __str__(self):
        return self.name


class Room(models.Model):

    STATUS = (
        ("available", "Bo‘sh"),
        ("occupied", "Band"),
        ("maintenance", "Ta’mirda"),
    )

    number = models.CharField(
        max_length=20,
        unique=True,
    )

    floor = models.PositiveIntegerField(
        default=1,
    )

    room_type = models.ForeignKey(
        RoomType,
        on_delete=models.PROTECT,
        related_name="rooms",
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS,
        default="available",
    )

    description = models.TextField(
        blank=True,
        null=True,
    )

    # Eski bitta rasm maydoni.
    # Eski rasmlarni yo‘qotmaslik uchun qoldiramiz.
    image = models.ImageField(
        upload_to="rooms/",
        blank=True,
        null=True,
    )

    def __str__(self):
        return self.number


class RoomImage(models.Model):
    room = models.ForeignKey(
        Room,
        on_delete=models.CASCADE,
        related_name="images",
    )

    image = models.ImageField(
        upload_to="rooms/gallery/",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    class Meta:
        ordering = ["id"]

    def __str__(self):
        return f"Xona {self.room.number} - {self.id}"
