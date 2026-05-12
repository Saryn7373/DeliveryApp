from rest_framework import mixins, viewsets

from .models import Product, Store
from .serializers import ProductSerializer, StoreBriefSerializer, StoreSerializer


class StoreViewSet(mixins.ListModelMixin,
                   mixins.RetrieveModelMixin,
                   viewsets.GenericViewSet):
    """
    GET /api/products/stores/       — список магазинов (без товаров)
    GET /api/products/stores/{id}/  — магазин с полным списком товаров
    """
    queryset = Store.objects.select_related('node').prefetch_related('products').all()

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return StoreSerializer
        return StoreBriefSerializer


class ProductViewSet(mixins.ListModelMixin,
                     mixins.RetrieveModelMixin,
                     viewsets.GenericViewSet):
    """
    GET /api/products/products/          — все товары (поддерживает ?store={id})
    GET /api/products/products/{id}/     — конкретный товар
    """
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.select_related('store').all()
        store_id = self.request.query_params.get('store')
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs
