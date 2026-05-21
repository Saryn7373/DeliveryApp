from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourierViewSet, CustomerViewSet, DeliveryAddressViewSet

router = DefaultRouter()
router.register('customers', CustomerViewSet, basename='customer')
router.register('couriers', CourierViewSet, basename='courier')
router.register('addresses', DeliveryAddressViewSet, basename='address')

urlpatterns = [
    path('', include(router.urls)),
]
