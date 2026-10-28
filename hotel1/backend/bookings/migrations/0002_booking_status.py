from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies=[('bookings','0001_initial')]
    operations=[
        migrations.AlterField(model_name='booking',name='status',field=models.CharField(choices=[('pending','Pending'),('confirmed','Confirmed'),('checked_in','Checked in'),('checked_out','Checked out'),('cancelled','Cancelled')],default='pending',max_length=20)),
        migrations.AlterField(model_name='booking',name='payment_status',field=models.CharField(choices=[('unpaid','Unpaid'),('partial','Partial'),('paid','Paid'),('refunded','Refunded')],default='unpaid',max_length=20)),
    ]
