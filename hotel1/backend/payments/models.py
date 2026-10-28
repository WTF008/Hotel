from django.db import models
from django.conf import settings
from bookings.models import Booking
class Payment(models.Model):
    METHOD=(('cash','Naqd'),('card','Karta'),('transfer','Bank o‘tkazmasi'))
    STATUS=(('pending','Kutilmoqda'),('paid','To‘langan'),('refunded','Qaytarilgan'))
    booking=models.ForeignKey(Booking,on_delete=models.CASCADE,related_name='payments')
    amount=models.DecimalField(max_digits=12,decimal_places=2)
    method=models.CharField(max_length=20,choices=METHOD,default='cash')
    status=models.CharField(max_length=20,choices=STATUS,default='paid')
    transaction_id=models.CharField(max_length=100,blank=True)
    note=models.CharField(max_length=255,blank=True)
    created_by=models.ForeignKey(settings.AUTH_USER_MODEL,on_delete=models.SET_NULL,null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)
    class Meta: ordering=['-created_at']
