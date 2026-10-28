from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    RoomViewSet,
    RoomTypeViewSet,
)


router = DefaultRouter()

router.register(
    "types",
    RoomTypeViewSet,
    basename="room-type",
)

router.register(
    "",
    RoomViewSet,
    basename="room",
)


urlpatterns = [
    path(
        "",
        include(router.urls),
    ),
]