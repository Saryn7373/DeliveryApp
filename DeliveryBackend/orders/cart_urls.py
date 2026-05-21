from django.urls import path

from .cart_views import CartCheckoutView, CartItemView, CartView

urlpatterns = [
    path('', CartView.as_view()),
    path('items/<int:item_id>/', CartItemView.as_view()),
    path('checkout/', CartCheckoutView.as_view()),
]
