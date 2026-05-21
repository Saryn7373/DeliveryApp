from rest_framework import serializers

from products.serializers import ProductSerializer
from routing.serializers import NodeBriefSerializer
from users.serializers import CourierSerializer, CustomerSerializer
from .models import Order, OrderItem, Route


class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = ('path', 'total_weight', 'computed_at')


class OrderItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)

    class Meta:
        model = OrderItem
        fields = ('id', 'product', 'quantity', 'price_at_order')


class OrderItemCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('product', 'quantity')

    def validate_quantity(self, value):
        if value < 1:
            raise serializers.ValidationError('Количество должно быть больше 0.')
        return value


class OrderSerializer(serializers.ModelSerializer):
    customer = CustomerSerializer(read_only=True)
    courier = CourierSerializer(read_only=True)
    items = OrderItemSerializer(many=True, read_only=True)
    route = RouteSerializer(read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'status_display',
            'customer', 'courier',
            'store', 'delivery_address',
            'total_price', 'created_at', 'updated_at',
            'items', 'route',
        )


class OrderListSerializer(serializers.ModelSerializer):
    """Облегчённый сериализатор для списка заказов — без items и route."""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    customer_name = serializers.CharField(source='customer.user.get_full_name', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'status_display',
            'customer_name', 'courier',
            'store', 'delivery_address',
            'total_price', 'created_at',
        )


class OrderCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ('customer', 'store', 'delivery_address')


class CartSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'store', 'total_price', 'items', 'created_at')


class OrderTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)


class OrderAssignCourierSerializer(serializers.Serializer):
    courier_id = serializers.IntegerField()
