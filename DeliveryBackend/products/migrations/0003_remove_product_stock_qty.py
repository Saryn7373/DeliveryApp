from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0002_remove_product_store'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='product',
            name='stock_qty',
        ),
    ]
