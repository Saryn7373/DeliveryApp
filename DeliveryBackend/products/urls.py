from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import ProductViewSet, StoreViewSet

router = DefaultRouter()
router.register('stores', StoreViewSet, basename='store')
router.register('products', ProductViewSet, basename='product')

urlpatterns = [
    path('', include(router.urls)),
]
