from django.db import migrations, models
import django.db.models.deletion
class Migration(migrations.Migration):
    initial=True
    dependencies=[('bookings','0001_initial'),('users','0001_initial')]
    operations=[migrations.CreateModel(name='Payment',fields=[('id',models.BigAutoField(auto_created=True,primary_key=True,serialize=False,verbose_name='ID')),('amount',models.DecimalField(decimal_places=2,max_digits=12)),('method',models.CharField(choices=[('cash','Naqd'),('card','Karta'),('transfer','Bank o‘tkazmasi')],default='cash',max_length=20)),('status',models.CharField(choices=[('pending','Kutilmoqda'),('paid','To‘langan'),('refunded','Qaytarilgan')],default='paid',max_length=20)),('transaction_id',models.CharField(blank=True,max_length=100)),('note',models.CharField(blank=True,max_length=255)),('created_at',models.DateTimeField(auto_now_add=True)),('booking',models.ForeignKey(on_delete=django.db.models.deletion.CASCADE,related_name='payments',to='bookings.booking')),('created_by',models.ForeignKey(blank=True,null=True,on_delete=django.db.models.deletion.SET_NULL,to='users.user'))])]
