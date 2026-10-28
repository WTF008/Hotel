from django.contrib import admin
from .models import RoomType,Room
@admin.register(RoomType)
class RoomTypeAdmin(admin.ModelAdmin): list_display=('name','capacity','price_per_night')
@admin.register(Room)
class RoomAdmin(admin.ModelAdmin): list_display=('number','room_type','floor','status');list_filter=('status','room_type')
