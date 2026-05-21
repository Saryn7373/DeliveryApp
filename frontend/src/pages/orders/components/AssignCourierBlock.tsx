import React, { useState } from 'react';
import { useFetch } from '../../../hooks/useFetch';
import { ordersApi, usersApi } from '../../../api';
import type { Courier } from '../../../types';
import styles from '../OrdersPage.module.css';

const AssignCourierBlock: React.FC<{
  orderId: number;
  currentCourier: Courier | null;
  onAssigned: () => void;
}> = ({ orderId, currentCourier, onAssigned }) => {
  const { data: couriers } = useFetch<Courier[]>(() => usersApi.couriers());

  const available = couriers?.filter((c) => c.status === 'AVAILABLE') ?? [];

  const [selectedCourierId, setSelectedCourierId] = useState<number | ''>(
    currentCourier?.id ?? '',
  );
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const handleAssign = async () => {
    if (!selectedCourierId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await ordersApi.assignCourier(orderId, Number(selectedCourierId));
      onAssigned();
    } catch (e: any) {
      setAssignError(e?.detail ?? String(e));
    } finally {
      setAssigning(false);
    }
  };

  return (
    <div className={styles.assignBlock}>
      <p className={styles.sectionTitle}>Назначить курьера</p>

      {currentCourier && (
        <div className={styles.currentCourier}>
          ✓ Назначен:{' '}
          <strong>
            {currentCourier.user.first_name} {currentCourier.user.last_name}
          </strong>
          <span
            className={styles.statusBadge}
            style={{
              background: '#16a34a22',
              color: '#16a34a',
              marginLeft: 8,
            }}
          >
            Доступен
          </span>
        </div>
      )}

      <div className={styles.assignRow}>
        <select
          className={styles.assignSelect}
          value={selectedCourierId}
          onChange={(e) => setSelectedCourierId(Number(e.target.value))}
          disabled={assigning}
        >
          <option value="">Выберите курьера</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.user.first_name} {c.user.last_name} — {c.phone}
              {c.current_node ? ` (${c.current_node.name})` : ''}
            </option>
          ))}
        </select>

        <button
          className={styles.assignBtn}
          onClick={handleAssign}
          disabled={!selectedCourierId || assigning}
        >
          {assigning ? 'Назначение…' : 'Назначить'}
        </button>
      </div>

      {available.length === 0 && (
        <p className={styles.noCouriers}>Нет доступных курьеров</p>
      )}

      {assignError && (
        <p className={styles.transitionError}>{assignError}</p>
      )}
    </div>
  );
};

export default AssignCourierBlock