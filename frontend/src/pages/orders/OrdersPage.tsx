import React, { useState } from 'react';
import { useFetch } from '../../hooks/useFetch';
import { ordersApi } from '../../api';
import { buildOrderTree } from '../../patterns/composite/OrderComposite';
import { DeliveryIterator, iterateLeaves } from '../../patterns/iterator/DeliveryIterator';
import type { Order, OrderStatus } from '../../types';
import styles from './OrdersPage.module.css';

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Черновик',
  ASSEMBLING: 'Сборка',
  COURIER_SELECTION: 'Выбор курьера',
  DELIVERY: 'Доставка',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменён',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT: '#6b7280',
  ASSEMBLING: '#d97706',
  COURIER_SELECTION: '#7c3aed',
  DELIVERY: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
};

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['ASSEMBLING', 'CANCELLED'],
  ASSEMBLING: ['COURIER_SELECTION', 'CANCELLED'],
  COURIER_SELECTION: ['DELIVERY', 'CANCELLED'],
  DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

// OrderDetail modal uses Composite + Iterator 
const OrderDetail: React.FC<{ orderId: number; onClose: () => void }> = ({
  orderId,
  onClose,
}) => {
  const { data: order, loading, error, reload } = useFetch<Order>(
    () => ordersApi.get(orderId),
    [orderId],
  );

  const [transitioning, setTransitioning] = useState(false);

  if (loading) return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}><p className={styles.loading}>Загрузка…</p></div>
    </div>
  );
  if (error || !order) return (
    <div className={styles.modalOverlay}>
      <div className={styles.modal}><p className={styles.error}>{error}</p></div>
    </div>
  );

  //  Строим дерево через Composite 
  const tree = buildOrderTree(order);

  //  Обходим всё дерево Итератором 
  const allNodes = new DeliveryIterator(tree).toArray();
  // Только листья (позиции заказа) через FilteredIterator
  const leaves = iterateLeaves(tree).toArray();

  const handleTransition = async (status: OrderStatus) => {
    setTransitioning(true);
    try {
      await ordersApi.transition(orderId, status);
      await reload();
    } finally {
      setTransitioning(false);
    }
  };

  const nextStatuses = TRANSITIONS[order.status];

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Заказ #{order.id}</h2>
          <span
            className={styles.statusBadge}
            style={{ background: STATUS_COLOR[order.status] + '22', color: STATUS_COLOR[order.status] }}
          >
            {order.status_display}
          </span>
        </div>

        {/* Composite tree info */}
        <div className={styles.treeInfo}>
          <div className={styles.treeInfoItem}>
            <span className={styles.treeLabel}>Узлов в дереве</span>
            <span className={styles.treeValue}>{allNodes.length}</span>
          </div>
          <div className={styles.treeInfoItem}>
            <span className={styles.treeLabel}>Позиций (листья)</span>
            <span className={styles.treeValue}>{leaves.length}</span>
          </div>
          <div className={styles.treeInfoItem}>
            <span className={styles.treeLabel}>Итого</span>
            <span className={styles.treeValue}>{tree.getTotalPrice().toFixed(2)} ₽</span>
          </div>
          <div className={styles.treeInfoItem}>
            <span className={styles.treeLabel}>Кол-во товаров</span>
            <span className={styles.treeValue}>{tree.getItemCount()} шт.</span>
          </div>
        </div>

        <h3 className={styles.sectionTitle}>Состав заказа</h3>
        <div className={styles.itemsList}>
          {leaves.map((leaf) => (
            <div key={leaf.getId()} className={styles.orderItem}>
              <span className={styles.itemName}>{leaf.getName()}</span>
              <span className={styles.itemPrice}>{leaf.getTotalPrice().toFixed(2)} ₽</span>
            </div>
          ))}
        </div>

        {order.courier && (
          <div className={styles.courierBlock}>
            <span className={styles.sectionTitle}>Курьер:</span>{' '}
            {order.courier.user.first_name} {order.courier.user.last_name}
            <span className={`${styles.statusBadge} ${styles.courierStatus}`}
              style={{ background: order.courier.status === 'AVAILABLE' ? '#16a34a22' : '#dc262622',
                       color: order.courier.status === 'AVAILABLE' ? '#16a34a' : '#dc2626' }}>
              {order.courier.status === 'AVAILABLE' ? 'Доступен' : 'Занят'}
            </span>
          </div>
        )}

        {nextStatuses.length > 0 && (
          <div className={styles.transitions}>
            <p className={styles.sectionTitle}>Перевести в статус:</p>
            <div className={styles.transitionBtns}>
              {nextStatuses.map((s) => (
                <button
                  key={s}
                  className={styles.transitionBtn}
                  style={{ borderColor: STATUS_COLOR[s], color: STATUS_COLOR[s] }}
                  onClick={() => handleTransition(s)}
                  disabled={transitioning}
                >
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Orders list page 
export const OrdersPage: React.FC = () => {
  const { data: orders, loading, error } = useFetch(() => ordersApi.list());
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filtered = orders
    ? statusFilter
      ? orders.filter((o) => o.status === statusFilter)
      : orders
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Заказы</h1>
        <select
          className={styles.filterSelect}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {loading && <p className={styles.loading}>Загрузка заказов…</p>}
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.grid}>
        {filtered.map((order) => (
          <button
            key={order.id}
            className={styles.card}
            onClick={() => setSelectedId(order.id)}
          >
            <div className={styles.cardTop}>
              <span className={styles.orderId}>#{order.id}</span>
              <span
                className={styles.statusDot}
                style={{ background: STATUS_COLOR[order.status] }}
              />
            </div>
            <p className={styles.customerName}>{order.customer_name}</p>
            <p className={styles.statusLabel}>{order.status_display}</p>
            <p className={styles.price}>{parseFloat(order.total_price).toFixed(2)} ₽</p>
            <p className={styles.date}>
              {new Date(order.created_at).toLocaleDateString('ru-RU')}
            </p>
          </button>
        ))}
      </div>

      {selectedId && (
        <OrderDetail orderId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};