from django.core.exceptions import ValidationError

# Граф допустимых переходов: текущий статус → список разрешённых следующих
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
        """Бизнес-правила, которые нельзя выразить только графом переходов."""
        if target_status == 'DELIVERY' and self.order.courier_id is None:
            raise ValidationError("Нельзя начать доставку: курьер не назначен.")
        if target_status == 'ASSEMBLING' and not self.order.items.exists():
            raise ValidationError("Нельзя подтвердить пустой заказ.")

    def _post_transition_hooks(self, target_status: str) -> None:
        """Побочные эффекты после успешного перехода."""
        if target_status == 'ASSEMBLING':
            self._compute_and_save_route()

    def _compute_and_save_route(self) -> None:
        """Строит кратчайший маршрут от магазина до адреса и сохраняет его в Route."""
        from routing.algorithms import dijkstra  # local import — разрывает циклический импорт
        from orders.models import Route

        order = self.order
        from_node_id = order.store.node_id
        to_node_id   = order.delivery_address.node_id

        try:
            path, total_weight = dijkstra(from_node_id, to_node_id)
        except ValueError as exc:
            raise ValidationError(f"Невозможно построить маршрут для заказа: {exc}") from exc

        Route.objects.update_or_create(
            order=order,
            defaults={'path': path, 'total_weight': total_weight},
        )
