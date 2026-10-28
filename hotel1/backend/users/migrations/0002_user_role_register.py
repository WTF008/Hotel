from django.db import migrations, models
class Migration(migrations.Migration):
    dependencies=[('users','0001_initial')]
    operations=[migrations.AlterField(model_name='user',name='role',field=models.CharField(choices=[('admin','Admin'),('manager','Manager'),('register','Register'),('user','User')],default='user',max_length=20))]
