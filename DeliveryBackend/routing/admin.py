from django.contrib import admin
from .models import Node, Edge


@admin.register(Node)
class NodeAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'type', 'latitude', 'longitude')
    list_filter = ('type',)
    search_fields = ('name',)


@admin.register(Edge)
class EdgeAdmin(admin.ModelAdmin):
    list_display = ('id', 'from_node', 'to_node', 'weight')
    search_fields = ('from_node__name', 'to_node__name')
