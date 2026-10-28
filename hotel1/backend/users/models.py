from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ("admin", "Admin"),
        ("manager", "Manager"),
        ("register", "Register"),
        ("user", "User"),
    )
    email = models.EmailField("email address", unique=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="user")
    phone = models.CharField(max_length=30, blank=True)
    REQUIRED_FIELDS = ["email"]

    def __str__(self):
        return f"{self.username} ({self.role})"
