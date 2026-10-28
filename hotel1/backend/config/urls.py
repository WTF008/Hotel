from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse

def home(request):
    return JsonResponse({"service":"HOTEL BOOKING API","status":"ok"})

urlpatterns = [
    path("", home),
    path("admin/", admin.site.urls),
    path("api/auth/", include("users.urls")),
    path("api/rooms/", include("rooms.urls")),
    path("api/bookings/", include("bookings.urls")),
    path("api/reviews/", include("reviews.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/dashboard/", include("dashboard.urls")),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
