import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ordersApi } from '../../../api';
import { buildOrderTree } from '../../../patterns/composite/OrderComposite';
import { DeliveryIterator, iterateLeaves } from '../../../patterns/iterator/DeliveryIterator';
import type { Order, OrderStatus } from '../../../types';
import styles from '../OrdersPage.module.css';

// ── Step definitions ────────────────────────────────────────────────────────

const STEPS: Array<{ key: OrderStatus; label: string; color: string }> = [
  { key: 'ASSEMBLING',        label: 'Сборка',   color: '#d97706' },
  { key: 'COURIER_SELECTION', label: 'Курьер',   color: '#7c3aed' },
  { key: 'DELIVERY',          label: 'Доставка', color: '#2563eb' },
  { key: 'COMPLETED',         label: 'Доставлен',color: '#16a34a' },
];

const TERMINAL: OrderStatus[] = ['COMPLETED', 'CANCELLED'];
const CAN_CANCEL: OrderStatus[] = ['DRAFT', 'ASSEMBLING', 'COURIER_SELECTION', 'DELIVERY'];
const POLL_MS = 3000;

// ── Progress Stepper ────────────────────────────────────────────────────────

const OrderStepper: React.FC<{ status: OrderStatus; polling: boolean }> = ({
  status,
  polling,
}) => {
  const stepIdx = STEPS.findIndex((s) => s.key === status);

  return (
    <div className={styles.stepper}>
      {STEPS.map((step, i) => {
        const isCompleted = i < stepIdx;
        const isActive = i === stepIdx;
        const isUpcoming = i > stepIdx;

        return (
          <React.Fragment key={step.key}>
            <div className={styles.stepItem}>
              <div
                className={[
                  styles.stepCircle,
                  isCompleted ? styles.stepCircleCompleted : '',
                  isActive    ? styles.stepCircleActive    : '',
                  isUpcoming  ? styles.stepCircleUpcoming  : '',
                ].filter(Boolean).join(' ')}
                style={
                  isActive
                    ? ({ '--step-color': step.color, borderColor: step.color, color: step.color } as React.CSSProperties)
                    : undefined
                }
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <span className={styles.stepLabel}>{step.label}</span>
              {isActive && polling && (
                <span className={styles.stepSubLabel}>в процессе…</span>
              )}
              {isActive && !polling && status !== 'COMPLETED' && (
                <span className={styles.stepSubLabel}>{step.label}</span>
              )}
            </div>

            {i < STEPS.length - 1 && (
              <div className={styles.stepConnectorWrap}>
                <div
                  className={[
                    styles.stepConnector,
                    i < stepIdx ? styles.stepConnectorFilled : '',
                  ].filter(Boolean).join(' ')}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

// ── Main component ──────────────────────────────────────────────────────────

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
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const prevStatusRef = useRef<OrderStatus | null>(null);

  const fetchOrder = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const data = await ordersApi.get(orderId);
        setOrder(data);
        setFetchError(null);
      } catch (e: any) {
        if (!silent) setFetchError(e?.detail ?? String(e));
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [orderId],
  );

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // Notify parent on status change
  useEffect(() => {
    if (!order) return;
    if (prevStatusRef.current !== null && prevStatusRef.current !== order.status) {
      onStatusChange?.();
    }
    prevStatusRef.current = order.status;
  }, [order?.status]);

  // Silent polling — stops at terminal status
  useEffect(() => {
    if (!autoPolling || !order) return;
    if (TERMINAL.includes(order.status)) return;
    const timer = setInterval(() => fetchOrder(true), POLL_MS);
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

  // ── Render ──

  if (loading)
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <p className={styles.loading}>Загрузка…</p>
        </div>
      </div>
    );

  if (fetchError || !order)
    return (
      <div className={styles.modalOverlay}>
        <div className={styles.modal}>
          <p className={styles.error}>{fetchError}</p>
        </div>
      </div>
    );

  const tree = buildOrderTree(order);
  const allNodes = new DeliveryIterator(tree).toArray();
  const leaves = iterateLeaves(tree).toArray();
  const canCancel = CAN_CANCEL.includes(order.status);
  const isCancelled = order.status === 'CANCELLED';
  const isLivePolling = autoPolling && !TERMINAL.includes(order.status);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeBtn} onClick={onClose}>✕</button>

        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>Заказ #{order.id}</h2>
          {isLivePolling && (
            <span className={styles.livePill}>
              <span className={styles.liveDot} />
              Live
            </span>
          )}
        </div>

        {/* Progress stepper */}
        {!isCancelled ? (
          <OrderStepper status={order.status} polling={isLivePolling} />
        ) : (
          <div className={styles.cancelledBanner}>Заказ отменён</div>
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
