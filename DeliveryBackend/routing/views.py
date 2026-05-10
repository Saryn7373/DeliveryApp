from rest_framework import status
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from routing.algorithms import dijkstra
from routing.models import Node
from routing.serializers import ShortestPathRequestSerializer, ShortestPathResponseSerializer


class ShortestPathView(APIView):
    """
    POST /api/routing/shortest-path/

    Находит кратчайший маршрут от узла-магазина до узла-адреса (Dijkstra).

    Request body:
        {
            "from_node": <store node id>,
            "to_node":   <address node id>
        }

    Response:
        {
            "path": [ {id, name, type, latitude, longitude}, … ],
            "total_weight": <float>
        }
    """

    def post(self, request: Request) -> Response:
        req_serializer = ShortestPathRequestSerializer(data=request.data)
        req_serializer.is_valid(raise_exception=True)

        from_node: Node = req_serializer.validated_data['from_node']
        to_node:   Node = req_serializer.validated_data['to_node']

        try:
            node_ids, total_weight = dijkstra(from_node.pk, to_node.pk)
        except ValueError as exc:
            return Response({'detail': str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        path_nodes = list(
            Node.objects.filter(pk__in=node_ids).in_bulk().values()
        )
        # Восстанавливаем порядок из алгоритма
        node_map = {n.pk: n for n in path_nodes}
        ordered_path = [node_map[nid] for nid in node_ids if nid in node_map]

        resp_serializer = ShortestPathResponseSerializer({
            'path': ordered_path,
            'total_weight': total_weight,
        })
        return Response(resp_serializer.data, status=status.HTTP_200_OK)
