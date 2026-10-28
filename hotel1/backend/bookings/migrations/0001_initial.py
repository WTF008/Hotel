from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = [("users","0001_initial"),("rooms","0001_initial")]
    operations = [
        migrations.CreateModel(
            name="Booking",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("check_in", models.DateField()),
                ("check_out", models.DateField()),
                ("guests", models.PositiveIntegerField(default=1)),
                ("total_price", models.DecimalField(decimal_places=2, max_digits=12)),
                ("status", models.CharField(choices=[("pending","Pending"),("confirmed","Confirmed"),("cancelled","Cancelled"),("completed","Completed")], default="pending", max_length=20)),
                ("payment_status", models.CharField(choices=[("unpaid","Unpaid"),("paid","Paid"),("refunded","Refunded")], default="unpaid", max_length=20)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="bookings", to="rooms.room")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="bookings", to="users.user")),
            ],
            options={"ordering":["-created_at"]},
        )
    ]
