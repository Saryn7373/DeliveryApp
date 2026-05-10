from django.contrib import admin
from .models import Store, Product


@admin.register(Store)
class StoreAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'address', 'node')
    search_fields = ('name', 'address')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'store', 'price', 'stock_qty')
    list_filter = ('store',)
    search_fields = ('name',)
