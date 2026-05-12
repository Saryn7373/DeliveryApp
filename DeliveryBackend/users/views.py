from rest_framework import mixins, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import Courier, Customer, DeliveryAddress
from .serializers import (
    CourierSerializer,
    CourierUpdateSerializer,
    CustomerSerializer,
    DeliveryAddressSerializer,
)


class CustomerViewSet(mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    GET /api/users/customers/               — список покупателей
    GET /api/users/customers/{id}/          — детальная информация
    GET /api/users/customers/{id}/addresses/ — адреса покупателя
    """
    queryset = Customer.objects.select_related('user').all()
    serializer_class = CustomerSerializer

    @action(detail=True, methods=['get'], url_path='addresses')
    def addresses(self, request, pk=None):
        customer = self.get_object()
        addresses = DeliveryAddress.objects.filter(customer=customer).select_related('node')
        serializer = DeliveryAddressSerializer(addresses, many=True)
        return Response(serializer.data)


class CourierViewSet(mixins.ListModelMixin,
                     mixins.RetrieveModelMixin,
                     mixins.UpdateModelMixin,
                     viewsets.GenericViewSet):
    """
    GET   /api/users/couriers/       — список курьеров
    GET   /api/users/couriers/{id}/  — детальная информация
    PATCH /api/users/couriers/{id}/  — обновить статус или текущий узел
    """
    queryset = Courier.objects.select_related('user', 'current_node').all()

    def get_serializer_class(self):
        if self.action in ('update', 'partial_update'):
            return CourierUpdateSerializer
        return CourierSerializer

    def update(self, request, *args, **kwargs):
        kwargs['partial'] = True
        return super().update(request, *args, **kwargs)
