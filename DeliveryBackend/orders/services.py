from routing.algorithms import dijkstra
from orders.models import Route


class RouteCalculator:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def compute(self, order) -> None:
        from_node_id = order.store.node_id
        to_node_id = order.delivery_address.node_id

        path, total_weight = dijkstra(from_node_id, to_node_id)

        Route.objects.update_or_create(
            order=order,
            defaults={'path': path, 'total_weight': total_weight},
        )


# ─── Паттерн Стратегия: выбор курьера ────────────────────────────────────────

class CourierSelectionStrategy:
    def select(self, available_couriers, order):
        raise NotImplementedError


class NearestCourierStrategy(CourierSelectionStrategy):
    """Выбирает курьера с наименьшим расстоянием до магазина (алгоритм Дейкстры)."""

    def select(self, available_couriers, order):
        store_node_id = order.store.node_id
        best_courier = None
        best_dist = float('inf')

        for courier in available_couriers:
            try:
                _, dist = dijkstra(courier.current_node_id, store_node_id)
                if dist < best_dist:
                    best_dist = dist
                    best_courier = courier
            except ValueError:
                continue

        return best_courier


class FirstAvailableCourierStrategy(CourierSelectionStrategy):
    """Выбирает первого свободного курьера из списка."""

    def select(self, available_couriers, order):
        return available_couriers[0] if available_couriers else None


# ─── Паттерн Декоратор ────────────────────────────────────────────────────────

class WithKnownLocationDecorator(CourierSelectionStrategy):
    """Декоратор: исключает курьеров без current_node перед передачей в стратегию."""

    def __init__(self, wrapped: CourierSelectionStrategy):
        self._wrapped = wrapped

    def select(self, available_couriers, order):
        located = [c for c in available_couriers if c.current_node_id is not None]
        if not located:
            return None
        return self._wrapped.select(located, order)


# ─── Синглтон-диспетчер ───────────────────────────────────────────────────────

class CourierDispatcher:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._strategy = NearestCourierStrategy()
        return cls._instance

    def set_strategy(self, strategy: CourierSelectionStrategy) -> None:
        self._strategy = strategy

    def assign(self, order) -> None:
        from users.models import Courier

        available = list(Courier.objects.filter(status=Courier.Status.AVAILABLE))

        if not available:
            raise Exception("Нет доступных курьеров.")

        courier = self._strategy.select(available, order)

        if courier is None:
            courier = available[0]

        order.courier = courier
        order.save(update_fields=['courier', 'updated_at'])
        courier.status = Courier.Status.BUSY
        courier.save(update_fields=['status'])