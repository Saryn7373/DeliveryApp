from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CourierViewSet, CustomerViewSet, RegisterView

router = DefaultRouter()
router.register('customers', CustomerViewSet, basename='customer')
router.register('couriers', CourierViewSet, basename='courier')

urlpatterns = [
    path('', include(router.urls)),
]
