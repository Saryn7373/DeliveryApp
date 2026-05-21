from rest_framework import mixins, viewsets
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.views import APIView
from rest_framework.response import Response

from .models import Courier, Customer, DeliveryAddress
from .serializers import (
    CourierSerializer,
    CourierUpdateSerializer,
    CustomerSerializer,
    DeliveryAddressSerializer,
    RegisterSerializer,
)


class CustomerViewSet(mixins.ListModelMixin,
                      mixins.RetrieveModelMixin,
                      viewsets.GenericViewSet):
    """
    GET /api/users/customers/      — список покупателей
    GET /api/users/customers/{id}/ — детальная информация
    """
    queryset = Customer.objects.select_related('user').all()
    serializer_class = CustomerSerializer


class DeliveryAddressViewSet(mixins.ListModelMixin,
                              mixins.RetrieveModelMixin,
                              viewsets.GenericViewSet):
    """
    GET /api/users/addresses/      — все адреса доставки
    GET /api/users/addresses/{id}/ — конкретный адрес
    """
    queryset = DeliveryAddress.objects.select_related('node').all()
    serializer_class = DeliveryAddressSerializer


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
    

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(
            data=request.data,
        )

        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED,
        )
