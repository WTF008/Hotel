from django.db.models import Q
from rest_framework import generics, permissions, viewsets
from rest_framework.exceptions import ValidationError
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import User
from .serializers import RegisterSerializer, ProfileSerializer, LoginSerializer, AdminUserSerializer
from .permissions import IsAdmin


class LoginView(TokenObtainPairView):
    serializer_class = LoginSerializer


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("-date_joined")
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdmin]
    forced_role = None  # Manager/Register endpointlarida o'rnatiladi

    def get_queryset(self):
        qs = super().get_queryset()
        if self.forced_role:
            qs = qs.filter(role=self.forced_role)
        role = self.request.query_params.get("role")
        q = self.request.query_params.get("q")
        if role:
            qs = qs.filter(role=role)
        if q:
            qs = qs.filter(Q(username__icontains=q) | Q(email__icontains=q))
        return qs

    def perform_create(self, serializer):
        if self.forced_role:
            serializer.save(role=self.forced_role)
        else:
            serializer.save()

    def perform_update(self, serializer):
        if self.forced_role:
            # /managers/ orqali rolni boshqasiga o'zgartirib bo'lmaydi
            serializer.save(role=self.forced_role)
        else:
            user = self.get_object()
            new_role = serializer.validated_data.get("role", user.role)
            new_active = serializer.validated_data.get("is_active", user.is_active)
            if user.pk == self.request.user.pk and (new_role != "admin" or not new_active):
                raise ValidationError({"detail": "O‘zingizning admin huquqingizni olib tashlab bo‘lmaydi."})
            serializer.save()

    def perform_destroy(self, instance):
        if instance.pk == self.request.user.pk:
            raise ValidationError({"detail": "O‘zingizni o‘chirib bo‘lmaydi."})
        if instance.bookings.exists():
            raise ValidationError({"detail": "Bronlari mavjud foydalanuvchini o‘chirib bo‘lmaydi. Avval akkauntni bloklang (is_active=false)."})
        instance.delete()


class ManagerViewSet(UserViewSet):
    forced_role = "manager"


class RegisterStaffViewSet(UserViewSet):
    forced_role = "register"
