from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):
    initial = True
    dependencies = [("users","0001_initial"),("rooms","0001_initial")]
    operations = [
        migrations.CreateModel(
            name="Review",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("rating", models.PositiveSmallIntegerField()),
                ("comment", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("room", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="reviews", to="rooms.room")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="users.user")),
            ],
            options={"ordering":["-created_at"]},
        )
    ]
