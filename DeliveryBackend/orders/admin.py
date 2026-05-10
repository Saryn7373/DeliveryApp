from django.contrib import admin
from .models import Order, OrderItem, Route


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    readonly_fields = ('price_at_order',)


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('id', 'customer', 'store', 'status', 'total_price', 'courier', 'created_at')
    list_filter = ('status', 'store')
    search_fields = ('customer__user__username', 'id')
    readonly_fields = ('created_at', 'updated_at')
    inlines = [OrderItemInline]


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'total_weight', 'computed_at')
    readonly_fields = ('computed_at',)
