from django.core.exceptions import ValidationError
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from users.models import Courier
from .models import Order, OrderItem
from .serializers import (
    OrderAssignCourierSerializer,
    OrderCreateSerializer,
    OrderItemCreateSerializer,
    OrderItemSerializer,
    OrderListSerializer,
    OrderSerializer,
    OrderTransitionSerializer,
)


class OrderViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   mixins.CreateModelMixin,
                   viewsets.GenericViewSet):
    """
    GET    /api/orders/                        — список заказов
    POST   /api/orders/                        — создать заказ
    GET    /api/orders/{id}/                   — детали заказа (с позициями и маршрутом)
    POST   /api/orders/{id}/add_item/          — добавить товар
    DELETE /api/orders/{id}/items/{item_id}/   — удалить товар из заказа
    POST   /api/orders/{id}/assign_courier/    — назначить курьера
    POST   /api/orders/{id}/transition/        — сменить статус
    """

    def get_queryset(self):
        qs = Order.objects.select_related(
            'customer__user', 'courier__user', 'store', 'delivery_address', 'route'
        ).prefetch_related('items__product')

        # фильтр по статусу: GET /api/orders/?status=DELIVERY
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        # фильтр по покупателю: GET /api/orders/?customer={id}
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            qs = qs.filter(customer_id=customer_id)

        # фильтр по курьеру: GET /api/orders/?courier={id}
        courier_id = self.request.query_params.get('courier')
        if courier_id:
            qs = qs.filter(courier_id=courier_id)

        return qs

    def get_serializer_class(self):
        if self.action == 'create':
            return OrderCreateSerializer
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='add_item')
    def add_item(self, request, pk=None):
        """POST /api/orders/{id}/add_item/  body: {product, quantity}"""
        order = self.get_object()

        if order.status != Order.Status.DRAFT:
            return Response(
                {'detail': 'Добавлять товары можно только в заказ со статусом DRAFT.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = OrderItemCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        product = serializer.validated_data['product']
        quantity = serializer.validated_data['quantity']

        item, created = OrderItem.objects.get_or_create(
            order=order,
            product=product,
            defaults={'quantity': quantity, 'price_at_order': product.price},
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=['quantity'])

        # пересчитываем total_price
        order.total_price = sum(
            i.price_at_order * i.quantity for i in order.items.all()
        )
        order.save(update_fields=['total_price'])

        return Response(OrderItemSerializer(item).data, status=status.HTTP_201_CREATED)

    # ------------------------------------------------------------------
    @action(detail=True, methods=['delete'], url_path=r'items/(?P<item_id>\d+)')
    def remove_item(self, request, pk=None, item_id=None):
        """DELETE /api/orders/{id}/items/{item_id}/"""
        order = self.get_object()

        if order.status != Order.Status.DRAFT:
            return Response(
                {'detail': 'Удалять товары можно только из заказа со статусом DRAFT.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            item = order.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Позиция не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        item.delete()

        order.total_price = sum(
            i.price_at_order * i.quantity for i in order.items.all()
        )
        order.save(update_fields=['total_price'])

        return Response(status=status.HTTP_204_NO_CONTENT)

    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='assign_courier')
    def assign_courier(self, request, pk=None):
        """POST /api/orders/{id}/assign_courier/  body: {courier_id}"""
        order = self.get_object()
        serializer = OrderAssignCourierSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            courier = Courier.objects.get(pk=serializer.validated_data['courier_id'])
        except Courier.DoesNotExist:
            return Response({'detail': 'Курьер не найден.'}, status=status.HTTP_404_NOT_FOUND)

        if courier.status != Courier.Status.AVAILABLE:
            return Response(
                {'detail': 'Курьер недоступен.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        order.courier = courier
        order.save(update_fields=['courier', 'updated_at'])

        return Response(OrderSerializer(order).data)

    # ------------------------------------------------------------------
    @action(detail=True, methods=['post'], url_path='transition')
    def transition(self, request, pk=None):
        """POST /api/orders/{id}/transition/  body: {status: "ASSEMBLING"}"""
        order = self.get_object()
        serializer = OrderTransitionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        target = serializer.validated_data['status']

        try:
            order.transition(target)
        except ValidationError as exc:
            return Response(
                {'detail': exc.message},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(OrderSerializer(order).data)

