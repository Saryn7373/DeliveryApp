from django.db import models
from .state_machine import OrderStateMachine


class Order(models.Model):
    class Status(models.TextChoices):
        DRAFT             = 'DRAFT',             'Черновик'
        ASSEMBLING        = 'ASSEMBLING',        'Сборка заказа'
        COURIER_SELECTION = 'COURIER_SELECTION', 'Выбор курьера'
        DELIVERY          = 'DELIVERY',          'Доставка'
        COMPLETED         = 'COMPLETED',         'Выполнен'
        CANCELLED         = 'CANCELLED',         'Отменён'

    customer         = models.ForeignKey('users.Customer',        on_delete=models.PROTECT, related_name='orders')
    store            = models.ForeignKey('products.Store',        on_delete=models.PROTECT, related_name='orders')
    delivery_address = models.ForeignKey('users.DeliveryAddress', on_delete=models.PROTECT, related_name='orders')
    courier          = models.ForeignKey('users.Courier',         on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    status           = models.CharField(max_length=20, choices=Status.choices, default=Status.DRAFT)
    total_price      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Заказ'
        verbose_name_plural = 'Заказы'
        ordering = ['-created_at']

    def __str__(self):
        return f"Заказ #{self.pk} [{self.get_status_display()}]"

    @property
    def state_machine(self) -> OrderStateMachine:
        return OrderStateMachine(self)

    def transition(self, target_status: str) -> None:
        """Перевести заказ в новое состояние через машину состояний."""
        self.state_machine.transition(target_status)


class OrderItem(models.Model):
    order          = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product        = models.ForeignKey('products.Product', on_delete=models.PROTECT, related_name='order_items')
    quantity       = models.PositiveIntegerField()
    price_at_order = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Позиция заказа'
        verbose_name_plural = 'Позиции заказа'

    def __str__(self):
        return f"{self.product.name} × {self.quantity}"


class Route(models.Model):
    """Кэшированный результат алгоритма Dijkstra/A* для заказа."""
    order        = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='route')
    path         = models.JSONField()   # [node_id, node_id, ...]
    total_weight = models.FloatField()
    computed_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Маршрут'
        verbose_name_plural = 'Маршруты'

    def __str__(self):
        return f"Маршрут для заказа #{self.order_id}"
