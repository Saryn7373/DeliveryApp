from rest_framework import serializers

from routing.models import Node


class ShortestPathRequestSerializer(serializers.Serializer):
    from_node = serializers.PrimaryKeyRelatedField(
        queryset=Node.objects.filter(type=Node.NodeType.STORE),
        help_text='ID узла-магазина (тип STORE)',
    )
    to_node = serializers.PrimaryKeyRelatedField(
        queryset=Node.objects.filter(type=Node.NodeType.ADDRESS),
        help_text='ID узла-адреса (тип ADDRESS)',
    )

    def validate(self, data):
        if data['from_node'] == data['to_node']:
            raise serializers.ValidationError('Начальный и конечный узел совпадают.')
        return data


class NodeBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Node
        fields = ('id', 'name', 'type', 'latitude', 'longitude')


class ShortestPathResponseSerializer(serializers.Serializer):
    path         = NodeBriefSerializer(many=True)
    total_weight = serializers.FloatField()
