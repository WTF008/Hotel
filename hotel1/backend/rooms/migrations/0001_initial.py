from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="RoomType",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("description", models.TextField(blank=True)),
                ("capacity", models.PositiveIntegerField(default=2)),
                ("price_per_night", models.DecimalField(decimal_places=2, max_digits=12)),
                ("amenities", models.JSONField(blank=True, default=list)),
                ("image", models.ImageField(blank=True, null=True, upload_to="room-types/")),
            ],
        ),
        migrations.CreateModel(
            name="Room",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("number", models.CharField(max_length=20, unique=True)),
                ("floor", models.PositiveIntegerField(default=1)),
                ("status", models.CharField(choices=[("available","Available"),("occupied","Occupied"),("maintenance","Maintenance")], default="available", max_length=20)),
                ("description", models.TextField(blank=True)),
                ("image", models.ImageField(blank=True, null=True, upload_to="rooms/")),
                ("room_type", models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="rooms", to="rooms.roomtype")),
            ],
        ),
    ]
