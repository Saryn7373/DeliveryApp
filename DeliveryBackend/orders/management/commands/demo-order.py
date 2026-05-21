# orders/management/commands/demo_order.py
import time
from django.core.management.base import BaseCommand
from orders.models import Order

class Command(BaseCommand):
    def add_arguments(self, parser):
        parser.add_argument('order_id', type=int)

    def handle(self, *args, **options):
        order = Order.objects.get(pk=options['order_id'])

        steps = [
            ('ASSEMBLING',        5),   # через 5 сек
            ('COURIER_SELECTION', 8),   # через 8 сек
            ('DELIVERY',          10),  # через 10 сек
            ('COMPLETED',         10),  # через 10 сек
        ]

        for status, delay in steps:
            self.stdout.write(f'Ждём {delay} сек...')
            time.sleep(delay)
            order.transition(status)
            self.stdout.write(f'→ {status}')