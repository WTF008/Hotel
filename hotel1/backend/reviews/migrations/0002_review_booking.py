from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("bookings", "0003_booking_nightly_rate"),
        ("reviews", "0001_initial"),
    ]
    operations = [
        migrations.AddField(
            model_name="review",
            name="booking",
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="review", to="bookings.booking"),
        ),
        migrations.AddConstraint(
            model_name="review",
            constraint=models.UniqueConstraint(fields=("booking",), name="unique_review_per_booking"),
        ),
    ]
