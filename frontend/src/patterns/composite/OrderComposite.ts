/**
 * ПАТТЕРН: КОМПОНОВЩИК (Composite)
 *
 * Иерархия заказа:
 *   OrderComposite (корень)
 *     └─ OrderItemLeaf (лист) × N
 *          └─ содержит Product
 *
 * Интерфейс DeliveryComponent позволяет единообразно работать
 * с заказом целиком и с каждой его позицией.
 */

import type { Order, OrderItem, Product } from '../../types';

// ─── Общий интерфейс компонента 
export interface DeliveryComponent {
  getId(): string;
  getName(): string;
  /** Суммарная стоимость узла и всех его потомков */
  getTotalPrice(): number;
  /** Количество "единиц" — товарных позиций */
  getItemCount(): number;
  /** Дочерние узлы (пусто у листьев) */
  getChildren(): DeliveryComponent[];
  /** Принять итератор / посетителя */
  accept(visitor: (component: DeliveryComponent) => void): void;
}

// ─── Лист: одна позиция заказа 
export class OrderItemLeaf implements DeliveryComponent {
  private readonly item: OrderItem

  constructor(item: OrderItem) {
    this.item = item
  }

  getId(): string {
    return `item-${this.item.id}`;
  }

  getName(): string {
    return `${this.item.product.name} × ${this.item.quantity}`;
  }

  getProduct(): Product {
    return this.item.product;
  }

  getQuantity(): number {
    return this.item.quantity;
  }

  getPriceAtOrder(): number {
    return parseFloat(this.item.price_at_order);
  }

  getTotalPrice(): number {
    return this.getPriceAtOrder() * this.getQuantity();
  }

  getItemCount(): number {
    return this.item.quantity;
  }

  /** Лист — детей нет */
  getChildren(): DeliveryComponent[] {
    return [];
  }

  accept(visitor: (component: DeliveryComponent) => void): void {
    visitor(this);
  }
}

// ─── Составной узел: весь заказ 
export class OrderComposite implements DeliveryComponent {
  private readonly children: OrderItemLeaf[];
  private readonly order: Order;

  constructor(order: Order) {
    this.order = order;
    this.children = order.items.map((item) => new OrderItemLeaf(item));
  }

  getId(): string {
    return `order-${this.order.id}`;
  }

  getName(): string {
    return `Заказ #${this.order.id} — ${this.order.status_display}`;
  }

  getStatus() {
    return this.order.status;
  }

  getOrder(): Order {
    return this.order;
  }

  getTotalPrice(): number {
    return parseFloat(this.order.total_price);
  }

  getItemCount(): number {
    return this.children.reduce((sum, c) => sum + c.getItemCount(), 0);
  }

  getChildren(): DeliveryComponent[] {
    return this.children;
  }

  /** Рекурсивный обход: сначала сам, потом все дети */
  accept(visitor: (component: DeliveryComponent) => void): void {
    visitor(this);
    this.children.forEach((child) => child.accept(visitor));
  }
}

/** Фабрика — создаёт OrderComposite из «сырого» объекта Order */
export function buildOrderTree(order: Order): OrderComposite {
  return new OrderComposite(order);
}