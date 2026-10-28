from django.db import migrations, models
from django.db.models import F


def fill_rates(apps, schema_editor):
    Booking = apps.get_model("bookings", "Booking")
    for booking in Booking.objects.select_related("room__room_type").all().iterator():
        rate = booking.room.room_type.price_per_night
        booking.nightly_rate = rate
        if not booking.total_price:
            booking.total_price = (booking.check_out - booking.check_in).days * rate
        booking.save(update_fields=["nightly_rate", "total_price"])


class Migration(migrations.Migration):
    dependencies = [("bookings", "0002_booking_status")]
    operations = [
        migrations.AddField(
            model_name="booking",
            name="nightly_rate",
            field=models.DecimalField(decimal_places=2, default=0, max_digits=12),
        ),
        migrations.RunPython(fill_rates, migrations.RunPython.noop),
    ]
