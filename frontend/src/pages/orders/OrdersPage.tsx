import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useFetch } from '../../hooks/useFetch';
import { ordersApi } from '../../api';
import type { OrderStatus, OrderListItem } from '../../types';
import OrderDetail from './components/OrderDetail';
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

export const OrdersPage: React.FC = () => {
  const location = useLocation();
  const newOrderId = (location.state as { newOrderId?: number } | null)?.newOrderId ?? null;

  const { data: orders, loading, error, reload: reloadOrders } = useFetch<OrderListItem[]>(
    () => ordersApi.list(),
  );
  const [selectedId, setSelectedId] = useState<number | null>(newOrderId);
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
            <option key={k} value={k}>
              {v}
            </option>
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
            <p className={styles.price}>
              {parseFloat(order.total_price).toFixed(2)} ₽
            </p>
            <p className={styles.date}>
              {new Date(order.created_at).toLocaleDateString('ru-RU')}
            </p>
          </button>
        ))}
      </div>

      {selectedId && (
        <OrderDetail
          orderId={selectedId}
          autoPolling={selectedId === newOrderId}
          onStatusChange={reloadOrders}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
};
