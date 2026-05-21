from django.core.exceptions import ValidationError

ALLOWED_TRANSITIONS: dict[str, list[str]] = {
    'DRAFT':             ['ASSEMBLING', 'CANCELLED'],
    'ASSEMBLING':        ['COURIER_SELECTION', 'CANCELLED'],
    'COURIER_SELECTION': ['DELIVERY', 'CANCELLED'],
    'DELIVERY':          ['COMPLETED', 'CANCELLED'],
    'COMPLETED':         [],
    'CANCELLED':         [],
}


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
        self._pre_transition_checks(target_status)
        self.order.status = target_status
        self.order.save(update_fields=['status', 'updated_at'])
        self._post_transition_hooks(target_status)

    def _pre_transition_checks(self, target_status: str) -> None:
        if target_status == 'DELIVERY' and self.order.courier_id is None:
            raise ValidationError("Нельзя начать доставку: курьер не назначен.")
        if target_status == 'ASSEMBLING' and not self.order.items.exists():
            raise ValidationError("Нельзя подтвердить пустой заказ.")

    def _post_transition_hooks(self, target_status: str) -> None:
        from orders.services import CourierDispatcher, RouteCalculator

        if target_status == 'ASSEMBLING':
            try:
                RouteCalculator().compute(self.order)
            except ValueError as exc:
                raise ValidationError(f"Невозможно построить маршрут: {exc}") from exc

        if target_status == 'COURIER_SELECTION':
            try:
                CourierDispatcher().assign(self.order)
            except Exception as exc:
                raise ValidationError(str(exc)) from exc