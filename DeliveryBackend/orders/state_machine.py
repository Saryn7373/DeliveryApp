from django.core.exceptions import ValidationError

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    'DRAFT':             ['ASSEMBLING', 'CANCELLED'],
    'ASSEMBLING':        ['COURIER_SELECTION', 'CANCELLED'],
    'COURIER_SELECTION': ['DELIVERY', 'CANCELLED'],
    'DELIVERY':          ['COMPLETED', 'CANCELLED'],
    'COMPLETED':         [],
    'CANCELLED':         [],
}


# ─── Шаблонный метод: базовый переход ────────────────────────────────────────

class BaseTransition:
    """Шаблонный метод: скелет перехода между состояниями заказа."""

    target_status: str = ''

    def execute(self, order) -> None:
        self.pre_check(order)
        order.status = self.target_status
        order.save(update_fields=['status', 'updated_at'])
        self.post_hook(order)

    def pre_check(self, order) -> None:
        """Валидация перед переходом. Подклассы переопределяют при необходимости."""
        pass

    def post_hook(self, order) -> None:
        """Побочные эффекты после перехода. Подклассы переопределяют при необходимости."""
        pass


# ─── Конкретные переходы ─────────────────────────────────────────────────────

class ToAssemblingTransition(BaseTransition):
    target_status = 'ASSEMBLING'

    def pre_check(self, order) -> None:
        from orders.factories import get_factory_for_order
        get_factory_for_order(order).create_validator().validate(order)

    def post_hook(self, order) -> None:
        from orders.services import RouteCalculator
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


# ─── Реестр переходов ─────────────────────────────────────────────────────────

TRANSITIONS: dict[str, BaseTransition] = {
    'ASSEMBLING':        ToAssemblingTransition(),
    'COURIER_SELECTION': ToCourierSelectionTransition(),
    'DELIVERY':          ToDeliveryTransition(),
    'COMPLETED':         ToCompletedTransition(),
    'CANCELLED':         ToCancelledTransition(),
}


# ─── Машина состояний ─────────────────────────────────────────────────────────

class OrderStateMachine:
    def __init__(self, order):
        self.order = order

    def can_transition(self, target_status: str) -> bool:
        return target_status in ALLOWED_TRANSITIONS.get(self.order.status, [])

    def transition(self, target_status: str) -> None:
        if not self.can_transition(target_status):
            raise ValidationError(
                f"Переход '{self.order.status}' → '{target_status}' недопустим. "
                f"Разрешено: {ALLOWED_TRANSITIONS.get(self.order.status, [])}"
            )
        TRANSITIONS[target_status].execute(self.order)
