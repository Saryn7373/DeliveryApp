from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Customer(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='customer_profile')
    phone = models.CharField(max_length=20)

    class Meta:
        verbose_name = 'Покупатель'
        verbose_name_plural = 'Покупатели'

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class Courier(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = 'AVAILABLE', 'Доступен'
        BUSY = 'BUSY', 'Занят'

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='courier_profile')
    phone = models.CharField(max_length=20)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.AVAILABLE)
    current_node = models.ForeignKey(
        'routing.Node',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='couriers_here',
    )

    class Meta:
        verbose_name = 'Курьер'
        verbose_name_plural = 'Курьеры'

    def __str__(self):
        name = self.user.get_full_name() or self.user.username
        return f"Курьер: {name} ({self.get_status_display()})"


class DeliveryAddress(models.Model):
    node = models.OneToOneField(
        'routing.Node', on_delete=models.CASCADE, related_name='delivery_address'
    )
    street_address = models.CharField(max_length=500)

    class Meta:
        verbose_name = 'Адрес доставки'
        verbose_name_plural = 'Адреса доставки'

    def __str__(self):
        return self.street_address
