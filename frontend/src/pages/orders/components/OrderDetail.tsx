import React, { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import { ordersApi } from '../../../api';
import { buildOrderTree } from '../../../patterns/composite/OrderComposite';
import { DeliveryIterator, iterateLeaves } from '../../../patterns/iterator/DeliveryIterator';
import type { Order, OrderStatus, RouteNode } from '../../../types';
import styles from '../OrdersPage.module.css';

const STATUS_COLOR: Record<OrderStatus, string> = {
  DRAFT: '#6b7280',
  ASSEMBLING: '#d97706',
  COURIER_SELECTION: '#7c3aed',
  DELIVERY: '#2563eb',
  COMPLETED: '#16a34a',
  CANCELLED: '#dc2626',
};

// Клиент может только отменить заказ (пока он не выполнен/отменён)
const CAN_CANCEL: OrderStatus[] = ['DRAFT', 'ASSEMBLING', 'COURIER_SELECTION', 'DELIVERY'];

const NODE_TYPE_LABEL: Record<string, string> = {
  STORE: 'Магазин',
  ADDRESS: 'Адрес',
};

const NODE_TYPE_STYLE: Record<string, { background: string; color: string }> = {
  STORE:   { background: '#dbeafe', color: '#1d4ed8' },
  ADDRESS: { background: '#dcfce7', color: '#166534' },
};

const OrderDetail: React.FC<{ orderId: number; onClose: () => void }> = ({
  orderId,
  onClose,
}) => {
  const { data: order, loading, error, reload } = useFetch<Order>(
    () => ordersApi.get(orderId),
    [orderId],
  );

  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

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
  const pathNodes: RouteNode[] = order.route?.path_nodes ?? [];
  const canCancel = CAN_CANCEL.includes(order.status);

  const handleCancel = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await ordersApi.transition(orderId, 'CANCELLED');
      await reload();
    } catch (e: any) {
      setCancelError(e?.detail ?? String(e));
    } finally {
      setCancelling(false);
    }
  };

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

        {/* Только кнопка отмены */}
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
