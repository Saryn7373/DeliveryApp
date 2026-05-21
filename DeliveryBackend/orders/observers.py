class Observer:
    def update(self, event: str, order) -> None:
        pass


class OrderStatusLogger(Observer):
    """Логирует каждое изменение статуса заказа в консоль."""

    def update(self, event: str, order) -> None:
        print(f"[LOG] Заказ #{order.pk}: статус изменён → {event}")


class CourierStatusObserver(Observer):
    """Освобождает курьера когда заказ завершён или отменён."""

    def update(self, event: str, order) -> None:
        if event in ('COMPLETED', 'CANCELLED') and order.courier:
            from users.models import Courier
            order.courier.status = Courier.Status.AVAILABLE
            order.courier.save(update_fields=['status'])
            print(f"[LOG] Курьер {order.courier} снова свободен")