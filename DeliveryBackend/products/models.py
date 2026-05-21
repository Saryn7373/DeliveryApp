from django.db import models


class Store(models.Model):
    node = models.OneToOneField(
        'routing.Node', on_delete=models.CASCADE, related_name='store'
    )
    name = models.CharField(max_length=255)
    address = models.CharField(max_length=500)

    class Meta:
        verbose_name = 'Магазин'
        verbose_name_plural = 'Магазины'

    def __str__(self):
        return self.name


class Product(models.Model):
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Товар'
        verbose_name_plural = 'Товары'

    def __str__(self):
        return self.name
