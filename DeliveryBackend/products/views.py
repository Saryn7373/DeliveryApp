from rest_framework import mixins, viewsets
from rest_framework.permissions import AllowAny

from .models import Product, Store
from .serializers import ProductSerializer, StoreBriefSerializer


class StoreViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    """
    GET /api/products/stores/      — список магазинов
    GET /api/products/stores/{id}/ — магазин
    """
    permission_classes = [AllowAny]
    queryset = Store.objects.select_related('node').all()
    serializer_class = StoreBriefSerializer


class ProductViewSet(mixins.ListModelMixin,
                     mixins.RetrieveModelMixin,
                     viewsets.GenericViewSet):
    """
    GET /api/products/products/      — все товары
    GET /api/products/products/{id}/ — конкретный товар
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer
    queryset = Product.objects.all()
