"""
Dijkstra's shortest path algorithm over the Node/Edge graph stored in the DB.

Usage:
    path, total_weight = dijkstra(from_node_id, to_node_id)
"""
import heapq
from collections import defaultdict

from routing.models import Edge


def dijkstra(from_node_id: int, to_node_id: int) -> tuple[list[int], float]:
    """
    Find the shortest path between two nodes using Dijkstra's algorithm.

    Returns
    -------
    path         : ordered list of node IDs (source … destination)
    total_weight : sum of edge weights along the path

    Raises
    ------
    ValueError   : if no path exists between the two nodes
    """
    # Build adjacency list from DB in a single query
    adjacency: dict[int, list[tuple[float, int]]] = defaultdict(list)
    for edge in Edge.objects.values('from_node_id', 'to_node_id', 'weight'):
        adjacency[edge['from_node_id']].append((edge['weight'], edge['to_node_id']))

    # Priority queue: (cumulative_distance, node_id)
    heap: list[tuple[float, int]] = [(0.0, from_node_id)]
    dist: dict[int, float] = {from_node_id: 0.0}
    prev: dict[int, int] = {}
    visited: set[int] = set()

    while heap:
        current_dist, u = heapq.heappop(heap)

        if u in visited:
            continue
        visited.add(u)

        if u == to_node_id:
            break

        for weight, v in adjacency[u]:
            new_dist = current_dist + weight
            if new_dist < dist.get(v, float('inf')):
                dist[v] = new_dist
                prev[v] = u
                heapq.heappush(heap, (new_dist, v))

    if to_node_id not in dist:
        raise ValueError(
            f'Маршрут между узлами {from_node_id} и {to_node_id} не найден. '
            'Проверьте связность графа.'
        )

    # Reconstruct the path by tracing prev pointers
    path: list[int] = []
    node = to_node_id
    while node != from_node_id:
        path.append(node)
        node = prev[node]
    path.append(from_node_id)
    path.reverse()

    return path, round(dist[to_node_id], 4)
