from django.core.exceptions import ValidationError
from orders.observers import OrderStatusLogger, CourierStatusObserver

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    'DRAFT':             ['ASSEMBLING', 'CANCELLED'],
    'ASSEMBLING':        ['COURIER_SELECTION', 'CANCELLED'],
    'COURIER_SELECTION': ['DELIVERY', 'CANCELLED'],
    'DELIVERY':          ['COMPLETED', 'CANCELLED'],
    'COMPLETED':         [],
    'CANCELLED':         [],
}


class BaseTransition:
    """Шаблонный метод: скелет перехода между состояниями заказа."""

    target_status: str = ''

    def execute(self, order) -> None:
        self.pre_check(order)
        order.status = self.target_status
        order.save(update_fields=['status', 'updated_at'])
        self.post_hook(order)

    def pre_check(self, order) -> None:
        pass

    def post_hook(self, order) -> None:
        pass


class ToAssemblingTransition(BaseTransition):
    target_status = 'ASSEMBLING'

    def pre_check(self, order) -> None:
        from orders.factories import get_factory_for_order
        get_factory_for_order(order).create_validator().validate(order)

    def post_hook(self, order) -> None:
        from orders.services import RouteCalculator
        _deduct_stock(order)
        try:
            RouteCalculator().compute(order)
        except ValueError as exc:
            raise ValidationError(f"Невозможно построить маршрут: {exc}") from exc


class ToCourierSelectionTransition(BaseTransition):
    target_status = 'COURIER_SELECTION'

    def post_hook(self, order) -> None:
        from orders.factories import get_factory_for_order
        from orders.services import CourierDispatcher
        dispatcher = CourierDispatcher()
        dispatcher.set_strategy(get_factory_for_order(order).create_courier_strategy())
        try:
            dispatcher.assign(order)
        except Exception as exc:
            raise ValidationError(str(exc)) from exc


class ToDeliveryTransition(BaseTransition):
    target_status = 'DELIVERY'

    def pre_check(self, order) -> None:
        if order.courier_id is None:
            raise ValidationError("Нельзя начать доставку: курьер не назначен.")


class ToCompletedTransition(BaseTransition):
    target_status = 'COMPLETED'


class ToCancelledTransition(BaseTransition):
    target_status = 'CANCELLED'


TRANSITIONS: dict[str, BaseTransition] = {
    'ASSEMBLING':        ToAssemblingTransition(),
    'COURIER_SELECTION': ToCourierSelectionTransition(),
    'DELIVERY':          ToDeliveryTransition(),
    'COMPLETED':         ToCompletedTransition(),
    'CANCELLED':         ToCancelledTransition(),
}


def _deduct_stock(order) -> None:
    """Проверяет наличие и списывает товары со склада."""
    from django.db.models import F
    items = list(order.items.select_related('product').all())

    for item in items:
        if item.product.stock_qty < item.quantity:
            raise ValidationError(
                f"Недостаточно товара '{item.product.name}' на складе. "
                f"Доступно: {item.product.stock_qty}, запрошено: {item.quantity}."
            )

    for item in items:
        item.product.stock_qty = F('stock_qty') - item.quantity
        item.product.save(update_fields=['stock_qty'])


class OrderStateMachine:
    def __init__(self, order):
        self.order = order
        self._observers = [OrderStatusLogger(), CourierStatusObserver()]

    def can_transition(self, target_status: str) -> bool:
        return target_status in ALLOWED_TRANSITIONS.get(self.order.status, [])

    def transition(self, target_status: str) -> None:
        if not self.can_transition(target_status):
            raise ValidationError(
                f"Переход '{self.order.status}' → '{target_status}' недопустим. "
                f"Разрешено: {ALLOWED_TRANSITIONS.get(self.order.status, [])}"
            )
        TRANSITIONS[target_status].execute(self.order)
        for obs in self._observers:
            obs.update(target_status, self.order)
