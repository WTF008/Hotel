from rest_framework import viewsets, permissions
from rest_framework.exceptions import PermissionDenied
from .models import Review
from .serializers import ReviewSerializer

MODERATORS = {"admin", "manager"}


class ReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ReviewSerializer

    def get_queryset(self):
        qs = Review.objects.select_related("user", "room", "booking")
        room = self.request.query_params.get("room")
        if room:
            if not room.isdigit():
                from rest_framework.exceptions import ValidationError
                raise ValidationError({"room": "room musbat butun son bo‘lishi kerak."})
            qs = qs.filter(room_id=int(room))
        return qs

    def get_permissions(self):
        return [permissions.AllowAny()] if self.request.method in permissions.SAFE_METHODS else [permissions.IsAuthenticated()]

    def _check_owner(self, instance):
        user = self.request.user
        if instance.user_id != user.id and user.role not in MODERATORS:
            raise PermissionDenied("Bu sharhni o‘zgartirishga ruxsat yo‘q.")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        self._check_owner(serializer.instance)
        # Reviewning booking/user bog'lanishi o'zgartirilmasin.
        serializer.save(booking=serializer.instance.booking, user=serializer.instance.user)

    def perform_destroy(self, instance):
        self._check_owner(instance)
        instance.delete()
