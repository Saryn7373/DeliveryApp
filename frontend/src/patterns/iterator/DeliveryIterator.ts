/**
 * ПАТТЕРН: ИТЕРАТОР (Iterator)
 *
 * DeliveryIterator обходит дерево DeliveryComponent
 * в порядке «сначала корень, затем потомки» (pre-order DFS).
 *
 * Реализует стандартный JS-протокол итерируемых объектов
 * (Symbol.iterator), что позволяет использовать его в for...of.
 *
 * FilteredIterator — декоратор, который добавляет предикат-фильтр
 * поверх базового итератора.
 */

import type { DeliveryComponent } from '../composite/OrderComposite';

// ─── Базовый итератор (DFS pre-order)
export class DeliveryIterator implements Iterable<DeliveryComponent> {
  private readonly stack: DeliveryComponent[];

  constructor(root: DeliveryComponent) {
    this.stack = [root];
  }

  [Symbol.iterator](): Iterator<DeliveryComponent> {
    const stack = [...this.stack];

    return {
      next(): IteratorResult<DeliveryComponent> {
        if (stack.length === 0) return { done: true, value: undefined as never };

        const current = stack.shift()!;
        // Добавляем детей в начало стека для DFS
        stack.unshift(...current.getChildren());

        return { done: false, value: current };
      },
    };
  }

  /** Вспомогательный: собрать все узлы в массив */
  toArray(): DeliveryComponent[] {
    return [...this];
  }
}

// ─── Фильтрующий итератор 
export class FilteredIterator implements Iterable<DeliveryComponent> {
    private readonly source: Iterable<DeliveryComponent>
    private readonly predicate: (c: DeliveryComponent) => boolean
  constructor(source: Iterable<DeliveryComponent>, predicate: (c: DeliveryComponent) => boolean) {
    this.source = source
    this.predicate = predicate
  }

  [Symbol.iterator](): Iterator<DeliveryComponent> {
    const inner = this.source[Symbol.iterator]();

    return {
      next(): IteratorResult<DeliveryComponent> {
        let result = inner.next();
        while (!result.done && !this.predicate!(result.value)) {
          result = inner.next();
        }
        return result;
      },
      predicate: this.predicate,
    } as Iterator<DeliveryComponent> & { predicate: (c: DeliveryComponent) => boolean };
  }

  toArray(): DeliveryComponent[] {
    return [...this];
  }
}

// ─── Хелперы для типовых фильтров 
export function iterateLeaves(root: DeliveryComponent): FilteredIterator {
  return new FilteredIterator(
    new DeliveryIterator(root),
    (c) => c.getChildren().length === 0,
  );
}

export function iterateByMinPrice(
  root: DeliveryComponent,
  minPrice: number,
): FilteredIterator {
  return new FilteredIterator(
    new DeliveryIterator(root),
    (c) => c.getTotalPrice() >= minPrice,
  );
}