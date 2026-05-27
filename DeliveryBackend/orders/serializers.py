from rest_framework import serializers

from routing.models import Node
from products.serializers import ProductSerializer
from users.serializers import CourierSerializer, CustomerSerializer
from .models import Order, OrderItem, Route


class RouteNodeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ('id', 'name', 'type', 'latitude', 'longitude')


class RouteSerializer(serializers.ModelSerializer):
    path_nodes = serializers.SerializerMethodField()

    class Meta:
        model = Route
        fields = ('path', 'path_nodes', 'total_weight', 'computed_at')

    def get_path_nodes(self, obj):
        node_map = {n.pk: n for n in Node.objects.filter(pk__in=obj.path)}
        ordered = [node_map[nid] for nid in obj.path if nid in node_map]
        return RouteNodeSerializer(ordered, many=True).data


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
    order_type_display = serializers.CharField(source='get_order_type_display', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'status', 'status_display',
            'order_type', 'order_type_display',
            'customer', 'courier',
            'store', 'delivery_address',
            'total_price', 'created_at', 'updated_at',
            'items', 'route',
        )


class OrderListSerializer(serializers.ModelSerializer):
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
        fields = ('customer', 'store', 'delivery_address', 'order_type')


class CartSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ('id', 'store', 'total_price', 'items', 'created_at')


class OrderTransitionSerializer(serializers.Serializer):
    status = serializers.ChoiceField(choices=Order.Status.choices)