from django.contrib import admin
from .models import Booking
@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin): list_display=('id','user','room','check_in','check_out','total_price','status','payment_status');list_filter=('status','payment_status')
