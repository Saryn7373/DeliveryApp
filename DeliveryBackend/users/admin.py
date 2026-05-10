from django.contrib import admin
from .models import Customer, Courier, DeliveryAddress


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'phone')
    search_fields = ('user__username', 'user__email', 'phone')


@admin.register(Courier)
class CourierAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'phone', 'status', 'current_node')
    list_filter = ('status',)
    search_fields = ('user__username', 'phone')


@admin.register(DeliveryAddress)
class DeliveryAddressAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'street_address', 'node')
    search_fields = ('street_address', 'customer__user__username')
