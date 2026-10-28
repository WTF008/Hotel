from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("username", "email", "password", "first_name", "last_name", "phone")

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Bu email allaqachon ro‘yxatdan o‘tgan.")
        return value

    def validate(self, attrs):
        validate_password(attrs["password"], User(username=attrs.get("username", ""), email=attrs.get("email", "")))
        return attrs

    def create(self, validated_data):
        # role hech qachon clientdan olinmaydi: har doim "user"
        return User.objects.create_user(role="user", **validated_data)


class UserSerializer(serializers.ModelSerializer):
    """Faqat o'qish uchun (login javobi va /me/ GET)."""
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "phone", "role", "is_active", "date_joined")
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    """/me/ — foydalanuvchi o'zi o'zgartira oladigan maydonlar. role/is_active/username o'zgarmaydi."""
    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "phone", "role", "is_active", "date_joined")
        read_only_fields = ("id", "username", "role", "is_active", "date_joined")

    def validate_email(self, value):
        value = value.strip().lower()
        qs = User.objects.filter(email__iexact=value)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Bu email band.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)

    class Meta:
        model = User
        fields = ("id", "username", "email", "first_name", "last_name", "phone", "role", "is_active", "date_joined", "password")
        read_only_fields = ("id", "date_joined")

    def validate(self, attrs):
        # Yangi foydalanuvchi parolsiz yaratilmasin (login qila olmay qoladi)
        if not self.instance and not attrs.get("password"):
            raise serializers.ValidationError({"password": "Yangi foydalanuvchi uchun parol majburiy."})
        if attrs.get("password"):
            validate_password(attrs["password"], self.instance or User(username=attrs.get("username", "")))
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for key, value in validated_data.items():
            setattr(instance, key, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class LoginSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["role"] = user.role
        token["email"] = user.email
        token["username"] = user.username
        return token

    def validate(self, attrs):
        # "Username yoki email" bilan kirish (frontendda shunday yozilgan edi, lekin ishlamagan)
        login = attrs.get(self.username_field, "")
        if "@" in login:
            match = User.objects.filter(email__iexact=login.strip()).first()
            if match:
                attrs[self.username_field] = match.get_username()
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
