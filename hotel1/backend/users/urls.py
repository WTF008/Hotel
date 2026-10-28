from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import LoginView, RegisterView, MeView, UserViewSet, ManagerViewSet, RegisterStaffViewSet
router = DefaultRouter()
router.register("users", UserViewSet, basename="users")
router.register("managers", ManagerViewSet, basename="managers")
router.register("registers", RegisterStaffViewSet, basename="registers")
urlpatterns = [
    path("login/", LoginView.as_view()), path("refresh/", TokenRefreshView.as_view()),
    path("register/", RegisterView.as_view()), path("me/", MeView.as_view()), path("", include(router.urls)),
]
