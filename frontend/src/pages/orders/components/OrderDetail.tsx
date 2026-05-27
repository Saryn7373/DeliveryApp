import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ordersApi } from '../../../api';
import { buildOrderTree } from '../../../patterns/composite/OrderComposite';
import { DeliveryIterator, iterateLeaves } from '../../../patterns/iterator/DeliveryIterator';
import type { Order, OrderStatus } from '../../../types';
import styles from '../OrdersPage.module.css';

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT: '#6b7280',
  ASSEMBLING: '#d97706',
  COURIER_SELECTION: '#7c3aed',
  DELIVERY: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
};

const CAN_CANCEL: OrderStatus[] = ['DRAFT', 'ASSEMBLING', 'COURIER_SELECTION', 'DELIVERY'];
const TERMINAL: OrderStatus[] = ['COMPLETED', 'CANCELLED'];
const POLL_INTERVAL_MS = 3000;

interface Props {
  orderId: number;
  onClose: () => void;
  autoPolling?: boolean;
  onStatusChange?: () => void;
}

const OrderDetail: React.FC<Props> = ({
  orderId,
  onClose,
  autoPolling = false,
  onStatusChange,
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const prevStatusRef = useRef<OrderStatus | null>(null);

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await ordersApi.get(orderId);
        setOrder(data);
        setError(null);
      } catch (e: any) {
        if (!silent) setError(e?.detail ?? String(e));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [orderId],
  );

  // Initial load
  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Notify parent when status changes
  useEffect(() => {
    if (!order) return;
    if (prevStatusRef.current !== null && prevStatusRef.current !== order.status) {
      onStatusChange?.();
    }
    prevStatusRef.current = order.status;
  }, [order?.status]);

  // Polling — silent fetches, stops on terminal status
  useEffect(() => {
    if (!autoPolling || !order) return;
    if (TERMINAL.includes(order.status)) return;

    const timer = setInterval(() => fetchOrder(true), POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [autoPolling, order?.status, fetchOrder]);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await ordersApi.transition(orderId, 'CANCELLED');
      await fetchOrder();
    } catch (e: any) {
      setCancelError(e?.detail ?? String(e));
    } finally {
      setCancelling(false);
    }
  };

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
  const canCancel = CAN_CANCEL.includes(order.status);
  const isLive = autoPolling && !TERMINAL.includes(order.status);
  const isCompleted = order.status === 'COMPLETED';

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

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

        {isLive && (
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            Отслеживается в реальном времени
          </div>
        )}

        {isCompleted && (
          <div className={styles.completedBanner}>
            Заказ успешно доставлен!
          </div>
        )}

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

        {/* Состав заказа */}
        <h3 className={styles.sectionTitle}>Состав заказа</h3>
        <div className={styles.itemsList}>
          {leaves.map((leaf) => (
            <div key={leaf.getId()} className={styles.orderItem}>
              <span className={styles.itemName}>{leaf.getName()}</span>
              <span className={styles.itemPrice}>{leaf.getTotalPrice().toFixed(2)} ₽</span>
            </div>
          ))}
        </div>

        {canCancel && (
          <div className={styles.transitions}>
            <button
              className={styles.cancelBtn}
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? 'Отмена...' : 'Отменить заказ'}
            </button>
            {cancelError && (
              <p className={styles.transitionError}>{cancelError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;
