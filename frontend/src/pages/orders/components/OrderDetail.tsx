import React, { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import { ordersApi } from '../../../api';
import { buildOrderTree } from '../../../patterns/composite/OrderComposite';
import { DeliveryIterator, iterateLeaves } from '../../../patterns/iterator/DeliveryIterator';
import AssignCourierBlock from './AssignCourierBlock';
import type { Order, OrderStatus } from '../../../types';
import styles from '../OrdersPage.module.css';

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

const OrderDetail: React.FC<{ orderId: number; onClose: () => void }> = ({
  orderId,
  onClose,
}) => {
  const { data: order, loading, error, reload } = useFetch<Order>(
    () => ordersApi.get(orderId),
    [orderId],
  );

  const [transitioning, setTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  if (loading)
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <p className={styles.loading}>Загрузка…</p>
        </div>
      </div>
    );

  if (error || !order)
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <p className={styles.error}>{error}</p>
        </div>
      </div>
    );

  const tree = buildOrderTree(order);
  const allNodes = new DeliveryIterator(tree).toArray();
  const leaves = iterateLeaves(tree).toArray();

  const handleTransition = async (status: OrderStatus) => {
    setTransitioning(true);
    setTransitionError(null);
    try {
      await ordersApi.transition(orderId, status);
      await reload();
    } catch (e: any) {
      setTransitionError(e?.detail ?? String(e));
    } finally {
      setTransitioning(false);
    }
  };

  const nextStatuses = TRANSITIONS[order.status];

  // Кнопка DELIVERY доступна только если курьер назначен
  const canTransitionTo = (s: OrderStatus) => {
    if (s === 'DELIVERY' && !order.courier) return false;
    return true;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>
          ✕
        </button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Заказ #{order.id}</h2>
          <span
            className={styles.statusBadge}
            style={{
              background: STATUS_COLOR[order.status] + '22',
              color: STATUS_COLOR[order.status],
            }}
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
            <span className={styles.treeValue}>
              {tree.getTotalPrice().toFixed(2)} ₽
            </span>
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
              <span className={styles.itemPrice}>
                {leaf.getTotalPrice().toFixed(2)} ₽
              </span>
            </div>
          ))}
        </div>

        {/* Блок курьера — показываем всегда если назначен */}
        {order.courier && order.status !== 'COURIER_SELECTION' && (
          <div className={styles.courierBlock}>
            <span className={styles.sectionTitle}>Курьер:</span>{' '}
            {order.courier.user.first_name} {order.courier.user.last_name}
            <span
              className={styles.statusBadge}
              style={{
                background:
                  order.courier.status === 'AVAILABLE'
                    ? '#16a34a22'
                    : '#dc262622',
                color:
                  order.courier.status === 'AVAILABLE' ? '#16a34a' : '#dc2626',
                marginLeft: 8,
              }}
            >
              {order.courier.status === 'AVAILABLE' ? 'Доступен' : 'Занят'}
            </span>
          </div>
        )}

        {/* Назначение курьера — только в статусе COURIER_SELECTION */}
        {order.status === 'COURIER_SELECTION' && (
          <AssignCourierBlock
            orderId={order.id}
            currentCourier={order.courier}
            onAssigned={reload}
          />
        )}

        {/* Переходы статусов */}
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
                  disabled={transitioning || !canTransitionTo(s)}
                  title={
                    s === 'DELIVERY' && !order.courier
                      ? 'Сначала назначьте курьера'
                      : undefined
                  }
                >
                  {STATUS_LABELS[s]}
                  {s === 'DELIVERY' && !order.courier ? ' 🔒' : ''}
                </button>
              ))}
            </div>
            {transitionError && (
              <p className={styles.transitionError}>{transitionError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


export default OrderDetail