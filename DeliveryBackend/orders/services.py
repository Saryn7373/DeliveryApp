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


class CourierDispatcher:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def assign(self, order) -> None:
        from users.models import Courier

        store_node_id = order.store.node_id
        available = list(Courier.objects.filter(status=Courier.Status.AVAILABLE))

        if not available:
            raise Exception("Нет доступных курьеров.")

        best_courier = None
        best_dist = float('inf')

        for courier in available:
            if courier.current_node_id is None:
                continue
            try:
                _, dist = dijkstra(courier.current_node_id, store_node_id)
                if dist < best_dist:
                    best_dist = dist
                    best_courier = courier
            except ValueError:
                continue

        if best_courier is None:
            best_courier = available[0]

        order.courier = best_courier
        order.save(update_fields=['courier', 'updated_at'])
        best_courier.status = Courier.Status.BUSY
        best_courier.save(update_fields=['status'])