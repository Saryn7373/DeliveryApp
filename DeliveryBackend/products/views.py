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
    GET /api/products/products/         — все товары
    GET /api/products/products/?store=1 — товары конкретного магазина
    GET /api/products/products/{id}/    — конкретный товар
    """
    permission_classes = [AllowAny]
    serializer_class = ProductSerializer

    def get_queryset(self):
        qs = Product.objects.all()
        store_id = self.request.query_params.get('store')
        if store_id:
            qs = qs.filter(store_id=store_id)
        return qs
