from django.core.exceptions import ValidationError
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product, Store
from users.models import DeliveryAddress
from .models import Order, OrderItem
from .serializers import CartSerializer, OrderSerializer


def _get_customer(request):
    try:
        return request.user.customer_profile
    except Exception:
        return None


def _get_cart(customer):
    return (
        Order.objects
        .filter(customer=customer, status=Order.Status.DRAFT)
        .prefetch_related('items__product')
        .first()
    )


def _get_or_create_cart(customer):
    cart = Order.objects.filter(customer=customer, status=Order.Status.DRAFT).first()
    if cart is None:
        store = Store.objects.first()
        if store is None:
            raise ValueError('Нет доступных магазинов.')
        cart = Order.objects.create(
            customer=customer,
            store=store,
            status=Order.Status.DRAFT,
            total_price=0,
        )
    return cart


def _recalc_total(cart):
    cart.total_price = sum(i.price_at_order * i.quantity for i in cart.items.all())
    cart.save(update_fields=['total_price'])


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        customer = _get_customer(request)
        if customer is None:
            return Response({'detail': 'Профиль покупателя не найден.'}, status=status.HTTP_403_FORBIDDEN)
        cart = _get_cart(customer)
        if cart is None:
            return Response({'id': None, 'items': [], 'total_price': '0.00'})
        return Response(CartSerializer(cart).data)

    def post(self, request):
        customer = _get_customer(request)
        if customer is None:
            return Response({'detail': 'Профиль покупателя не найден.'}, status=status.HTTP_403_FORBIDDEN)

        product_id = request.data.get('product_id')
        try:
            quantity = int(request.data.get('quantity', 1))
        except (TypeError, ValueError):
            quantity = 1

        if quantity < 1:
            return Response({'detail': 'Количество должно быть больше 0.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            product = Product.objects.get(pk=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Товар не найден.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            cart = _get_or_create_cart(customer)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        item, created = OrderItem.objects.get_or_create(
            order=cart,
            product=product,
            defaults={'quantity': quantity, 'price_at_order': product.price},
        )
        if not created:
            item.quantity += quantity
            item.save(update_fields=['quantity'])

        _recalc_total(cart)
        cart.refresh_from_db()
        return Response(CartSerializer(cart).data, status=status.HTTP_201_CREATED)


class CartItemView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, item_id):
        customer = _get_customer(request)
        if customer is None:
            return Response({'detail': 'Профиль покупателя не найден.'}, status=status.HTTP_403_FORBIDDEN)

        cart = Order.objects.filter(customer=customer, status=Order.Status.DRAFT).first()
        if cart is None:
            return Response({'detail': 'Корзина пуста.'}, status=status.HTTP_404_NOT_FOUND)

        try:
            item = cart.items.get(pk=item_id)
        except OrderItem.DoesNotExist:
            return Response({'detail': 'Позиция не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        item.delete()
        _recalc_total(cart)
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartCheckoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        customer = _get_customer(request)
        if customer is None:
            return Response({'detail': 'Профиль покупателя не найден.'}, status=status.HTTP_403_FORBIDDEN)

        cart = (
            Order.objects
            .filter(customer=customer, status=Order.Status.DRAFT)
            .prefetch_related('items')
            .first()
        )
        if cart is None:
            return Response({'detail': 'Корзина пуста.'}, status=status.HTTP_400_BAD_REQUEST)

        if not cart.items.exists():
            return Response({'detail': 'Добавьте товары перед оформлением.'}, status=status.HTTP_400_BAD_REQUEST)

        address_id = request.data.get('delivery_address_id')
        if not address_id:
            return Response({'detail': 'Укажите адрес доставки.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            address = DeliveryAddress.objects.get(pk=address_id)
        except DeliveryAddress.DoesNotExist:
            return Response({'detail': 'Адрес не найден.'}, status=status.HTTP_404_NOT_FOUND)

        cart.delivery_address = address
        cart.save(update_fields=['delivery_address'])

        try:
            cart.transition(Order.Status.ASSEMBLING)
        except ValidationError as exc:
            return Response({'detail': exc.message}, status=status.HTTP_400_BAD_REQUEST)

        return Response(OrderSerializer(cart).data)