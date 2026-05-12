from django.contrib.auth.models import User
from rest_framework import serializers

from routing.serializers import NodeBriefSerializer
from .models import Courier, Customer, DeliveryAddress


class UserBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'first_name', 'last_name', 'email')


class CustomerSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)

    class Meta:
        model = Customer
        fields = ('id', 'user', 'phone')


class DeliveryAddressSerializer(serializers.ModelSerializer):
    node = NodeBriefSerializer(read_only=True)

    class Meta:
        model = DeliveryAddress
        fields = ('id', 'street_address', 'node', 'customer')


class CourierSerializer(serializers.ModelSerializer):
    user = UserBriefSerializer(read_only=True)
    current_node = NodeBriefSerializer(read_only=True)

    class Meta:
        model = Courier
        fields = ('id', 'user', 'phone', 'status', 'current_node')


class CourierUpdateSerializer(serializers.ModelSerializer):
    """Только поля, которые фронт может менять."""

    class Meta:
        model = Courier
        fields = ('status', 'current_node')
