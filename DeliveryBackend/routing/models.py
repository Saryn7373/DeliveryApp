from django.db import models


class Node(models.Model):
    class NodeType(models.TextChoices):
        STORE = 'STORE', 'Магазин'
        ADDRESS = 'ADDRESS', 'Адрес доставки'

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=10, choices=NodeType.choices)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)

    class Meta:
        verbose_name = 'Узел'
        verbose_name_plural = 'Узлы'

    def __str__(self):
        return f"{self.get_type_display()}: {self.name}"


class Edge(models.Model):
    from_node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='edges_from')
    to_node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='edges_to')
    weight = models.FloatField(help_text='Расстояние или время в пути')

    class Meta:
        verbose_name = 'Ребро'
        verbose_name_plural = 'Рёбра'
        unique_together = ('from_node', 'to_node')

    def __str__(self):
        return f"{self.from_node} → {self.to_node} ({self.weight})"
