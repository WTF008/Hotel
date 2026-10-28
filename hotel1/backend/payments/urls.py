from rest_framework.routers import DefaultRouter
from django.urls import path,include
from .views import PaymentViewSet
router=DefaultRouter(); router.register('',PaymentViewSet,basename='payment')
urlpatterns=[path('',include(router.urls))]
