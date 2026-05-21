from django.core.exceptions import ValidationError
from orders.services import (
    CourierSelectionStrategy,
    NearestCourierStrategy,
    FirstAvailableCourierStrategy,
    WithKnownLocationDecorator,
)


# ─── Абстрактный продукт: валидатор заказа ───────────────────────────────────

class OrderValidator:
    def validate(self, order) -> None:
        raise NotImplementedError


class StandardOrderValidator(OrderValidator):
    """Базовая валидация: заказ не пустой и адрес указан."""

    def validate(self, order) -> None:
        if not order.items.exists():
            raise ValidationError("Заказ не содержит товаров.")
        if order.delivery_address is None:
            raise ValidationError("Не указан адрес доставки.")


class ExpressOrderValidator(OrderValidator):
    """Строгая валидация для срочных заказов: не более 5 позиций."""

    MAX_ITEMS = 5

    def validate(self, order) -> None:
        if not order.items.exists():
            raise ValidationError("Заказ не содержит товаров.")
        if order.delivery_address is None:
            raise ValidationError("Не указан адрес доставки.")
        if order.items.count() > self.MAX_ITEMS:
            raise ValidationError(
                f"Срочный заказ не может содержать более {self.MAX_ITEMS} позиций."
            )


# ─── Абстрактная фабрика ──────────────────────────────────────────────────────

class AbstractOrderFactory:
    def create_courier_strategy(self) -> CourierSelectionStrategy:
        raise NotImplementedError

    def create_validator(self) -> OrderValidator:
        raise NotImplementedError


# ─── Конкретные фабрики ───────────────────────────────────────────────────────

class StandardOrderFactory(AbstractOrderFactory):
    """Обычный заказ: ближайший курьер, стандартная валидация."""

    def create_courier_strategy(self) -> CourierSelectionStrategy:
        return WithKnownLocationDecorator(NearestCourierStrategy())

    def create_validator(self) -> OrderValidator:
        return StandardOrderValidator()


class ExpressOrderFactory(AbstractOrderFactory):
    """Срочный заказ: первый свободный курьер, строгая валидация."""

    def create_courier_strategy(self) -> CourierSelectionStrategy:
        return WithKnownLocationDecorator(FirstAvailableCourierStrategy())

    def create_validator(self) -> OrderValidator:
        return ExpressOrderValidator()


def get_factory_for_order(order) -> AbstractOrderFactory:
    if order.order_type == 'EXPRESS':
        return ExpressOrderFactory()
    return StandardOrderFactory()
