"""
python manage.py seed_db           — заполнить базу тестовыми данными
python manage.py seed_db --clear   — сначала очистить, потом заполнить
"""
import math
import random

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand
from faker import Faker

from orders.models import Order, OrderItem, Route
from products.models import Product, Store
from routing.models import Edge, Node
from users.models import Courier, Customer, DeliveryAddress

fake = Faker('ru_RU')
random.seed(42)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _euclidean(a: Node, b: Node) -> float:
    return math.sqrt((a.latitude - b.latitude) ** 2 + (a.longitude - b.longitude) ** 2)


def _make_edge(a: Node, b: Node) -> None:
    w = round(_euclidean(a, b), 2)
    Edge.objects.get_or_create(from_node=a, to_node=b, defaults={'weight': w})
    Edge.objects.get_or_create(from_node=b, to_node=a, defaults={'weight': w})


def _ensure_connected(nodes: list[Node]) -> None:
    """Гарантирует связность графа через минимальное остовное дерево (Prim)."""
    if len(nodes) < 2:
        return
    in_tree = {nodes[0].pk}
    remaining = list(nodes[1:])
    while remaining:
        best_src = best_dst = None
        best_dist = float('inf')
        for src in nodes:
            if src.pk not in in_tree:
                continue
            for dst in remaining:
                d = _euclidean(src, dst)
                if d < best_dist:
                    best_dist, best_src, best_dst = d, src, dst
        _make_edge(best_src, best_dst)
        in_tree.add(best_dst.pk)
        remaining.remove(best_dst)


# ---------------------------------------------------------------------------
# Seed sections
# ---------------------------------------------------------------------------

STORE_COORDS = [
    ('Склад «Центральный»', 55.75, 37.61),
    ('Склад «Северный»',    55.83, 37.58),
    ('Склад «Восточный»',   55.76, 37.80),
]

ADDRESS_COORDS = [
    ('Тверская, 10',          55.765, 37.605),
    ('Арбат, 5',              55.750, 37.593),
    ('Маросейка, 3',          55.757, 37.638),
    ('Новый Арбат, 22',       55.752, 37.575),
    ('Садовая-Кудринская, 1', 55.762, 37.581),
    ('Покровка, 14',          55.758, 37.650),
    ('Проспект Мира, 30',     55.785, 37.635),
    ('Ленинградский пр., 5',  55.793, 37.585),
    ('Щёлковская, 12',        55.790, 37.820),
    ('Войковская, 7',         55.818, 37.499),
]

PRODUCTS = [
    ('Молоко 1л',          89.00),
    ('Хлеб белый',         55.00),
    ('Масло сливочное',   145.00),
    ('Яйца С1 10шт',      110.00),
    ('Куриное филе 1кг',  350.00),
    ('Рис длиннозёрный',   95.00),
    ('Паста Barilla 500г', 130.00),
    ('Томатный соус',      80.00),
    ('Апельсины 1кг',     120.00),
    ('Бананы 1кг',         89.00),
    ('Яблоки Гала 1кг',    99.00),
    ('Сок мультифрукт',   115.00),
]


class Command(BaseCommand):
    help = 'Заполнить базу тестовыми данными'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Удалить все данные перед заполнением',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self._clear()

        store_nodes, addr_nodes = self._seed_nodes()
        self._seed_edges(store_nodes, addr_nodes)
        stores = self._seed_stores(store_nodes)
        products = self._seed_products()
        customers = self._seed_customers(count=6)
        couriers = self._seed_couriers(store_nodes, count=3)
        addresses = self._seed_addresses(addr_nodes)
        self._seed_orders(customers, stores, addresses, couriers, products)

        self.stdout.write(self.style.SUCCESS('База данных успешно заполнена.'))

    # ------------------------------------------------------------------
    def _clear(self):
        self.stdout.write('Очистка данных...')
        Route.objects.all().delete()
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        DeliveryAddress.objects.all().delete()
        Courier.objects.all().delete()
        Customer.objects.all().delete()
        Product.objects.all().delete()
        Store.objects.all().delete()
        Edge.objects.all().delete()
        Node.objects.all().delete()
        User.objects.filter(is_superuser=False).delete()
        self.stdout.write('  готово.')

    # ------------------------------------------------------------------
    def _seed_nodes(self) -> tuple[list[Node], list[Node]]:
        self.stdout.write('Создание узлов графа...')
        store_nodes = []
        for name, lat, lon in STORE_COORDS:
            n, _ = Node.objects.get_or_create(
                name=name,
                defaults={'type': Node.NodeType.STORE, 'latitude': lat, 'longitude': lon},
            )
            store_nodes.append(n)

        addr_nodes = []
        for name, lat, lon in ADDRESS_COORDS:
            n, _ = Node.objects.get_or_create(
                name=name,
                defaults={'type': Node.NodeType.ADDRESS, 'latitude': lat, 'longitude': lon},
            )
            addr_nodes.append(n)

        self.stdout.write(f'  {len(store_nodes)} магазина, {len(addr_nodes)} адресов.')
        return store_nodes, addr_nodes

    # ------------------------------------------------------------------
    def _seed_edges(self, store_nodes: list[Node], addr_nodes: list[Node]) -> None:
        self.stdout.write('Создание рёбер графа...')
        all_nodes = store_nodes + addr_nodes

        # минимальное остовное дерево — гарантия связности
        _ensure_connected(all_nodes)

        # дополнительные рёбра между «близкими» узлами (порог ~0.05°)
        THRESHOLD = 0.05
        for i, a in enumerate(all_nodes):
            for b in all_nodes[i + 1:]:
                if _euclidean(a, b) <= THRESHOLD:
                    _make_edge(a, b)

        self.stdout.write(f'  {Edge.objects.count()} рёбер.')

    # ------------------------------------------------------------------
    def _seed_stores(self, store_nodes: list[Node]) -> list[Store]:
        self.stdout.write('Создание магазинов...')
        stores = []
        for node, (name, *_) in zip(store_nodes, STORE_COORDS):
            s, _ = Store.objects.get_or_create(
                node=node,
                defaults={'name': name, 'address': node.name},
            )
            stores.append(s)
        self.stdout.write(f'  {len(stores)} магазина.')
        return stores

    # ------------------------------------------------------------------
    def _seed_products(self) -> list[Product]:
        self.stdout.write('Создание товаров...')
        result = []
        for pname, price in PRODUCTS:
            p, _ = Product.objects.get_or_create(
                name=pname,
                defaults={
                    'price': price,
                    'description': fake.sentence(nb_words=6),
                },
            )
            result.append(p)
        self.stdout.write(f'  {len(result)} товаров.')
        return result

    # ------------------------------------------------------------------
    def _seed_customers(self, count: int) -> list[Customer]:
        self.stdout.write(f'Создание {count} покупателей...')
        customers = []
        for i in range(1, count + 1):
            username = f'customer{i}'
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': fake.first_name(),
                    'last_name': fake.last_name(),
                    'email': fake.email(),
                },
            )
            user.set_password('pass1234')
            user.save()
            c, _ = Customer.objects.get_or_create(
                user=user,
                defaults={'phone': fake.phone_number()[:20]},
            )
            customers.append(c)
        return customers

    # ------------------------------------------------------------------
    def _seed_couriers(self, store_nodes: list[Node], count: int) -> list[Courier]:
        self.stdout.write(f'Создание {count} курьеров...')
        couriers = []
        for i in range(1, count + 1):
            username = f'courier{i}'
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    'first_name': fake.first_name_male(),
                    'last_name': fake.last_name_male(),
                    'email': fake.email(),
                },
            )
            user.set_password('pass1234')
            user.save()
            c, _ = Courier.objects.get_or_create(
                user=user,
                defaults={
                    'phone': fake.phone_number()[:20],
                    'status': Courier.Status.AVAILABLE,
                    'current_node': random.choice(store_nodes),
                },
            )
            couriers.append(c)
        return couriers

    # ------------------------------------------------------------------
    def _seed_addresses(self, addr_nodes: list[Node]) -> list[DeliveryAddress]:
        self.stdout.write('Создание адресов доставки...')
        addresses = []
        for node in addr_nodes:
            a, _ = DeliveryAddress.objects.get_or_create(
                node=node,
                defaults={'street_address': node.name},
            )
            addresses.append(a)
        self.stdout.write(f'  {len(addresses)} адресов.')
        return addresses

    # ------------------------------------------------------------------
    def _seed_orders(
        self,
        customers: list[Customer],
        stores: list[Store],
        addresses: list[DeliveryAddress],
        couriers: list[Courier],
        products: list[Product],
    ) -> None:
        self.stdout.write('Создание заказов...')

        # Пары (статус, нужен ли курьер)
        scenarios = [
            (Order.Status.DRAFT,             False),
            (Order.Status.ASSEMBLING,        False),
            (Order.Status.COURIER_SELECTION, False),
            (Order.Status.DELIVERY,          True),
            (Order.Status.COMPLETED,         True),
            (Order.Status.CANCELLED,         False),
            (Order.Status.COMPLETED,         True),
            (Order.Status.ASSEMBLING,        False),
        ]

        for status, needs_courier in scenarios:
            customer = random.choice(customers)
            store = random.choice(stores)
            address = random.choice(addresses)
            courier = random.choice(couriers) if needs_courier else None

            if not products:
                continue

            chosen = random.sample(products, k=min(random.randint(1, 3), len(products)))
            total = sum(p.price * random.randint(1, 4) for p in chosen)

            order = Order.objects.create(
                customer=customer,
                store=store,
                delivery_address=None if status == Order.Status.DRAFT else address,
                courier=courier,
                status=status,
                total_price=total,
            )

            for product in chosen:
                qty = random.randint(1, 4)
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=qty,
                    price_at_order=product.price,
                )

            # для завершённых заказов сохраняем маршрут
            if status in (Order.Status.DELIVERY, Order.Status.COMPLETED):
                src_node = store.node
                dst_node = address.node
                Route.objects.get_or_create(
                    order=order,
                    defaults={
                        'path': [src_node.pk, dst_node.pk],
                        'total_weight': round(_euclidean(src_node, dst_node), 4),
                    },
                )

        self.stdout.write(f'  {Order.objects.count()} заказов.')
