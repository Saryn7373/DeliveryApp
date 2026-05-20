import React, { useState } from 'react';
import { usersApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Courier, CourierStatus } from '../../types';
import styles from './CouriersPage.module.css';

const STATUS_LABELS: Record<CourierStatus, string> = {
  AVAILABLE: 'Доступен',
  BUSY: 'Занят',
};

const STATUS_CLASS: Record<CourierStatus, string> = {
  AVAILABLE: styles.available,
  BUSY: styles.busy,
};

const CourierCard: React.FC<{
  courier: Courier;
  onStatusChange: (id: number, status: CourierStatus) => Promise<void>;
}> = ({ courier, onStatusChange }) => {
  const [loading, setLoading] = useState(false);

  const toggleStatus = async () => {
    const nextStatus: CourierStatus =
      courier.status === 'AVAILABLE'
        ? 'BUSY'
        : 'AVAILABLE';

    setLoading(true);

    try {
      await onStatusChange(courier.id, nextStatus);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div>
          <h3 className={styles.name}>
            {courier.user.first_name} {courier.user.last_name}
          </h3>

          <p className={styles.username}>
            @{courier.user.username}
          </p>
        </div>

        <span
          className={`${styles.statusBadge} ${STATUS_CLASS[courier.status]}`}
        >
          {STATUS_LABELS[courier.status]}
        </span>
      </div>

      <div className={styles.infoBlock}>
        <div className={styles.infoRow}>
          <span className={styles.label}>Телефон</span>
          <span>{courier.phone}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Email</span>
          <span>{courier.user.email}</span>
        </div>

        <div className={styles.infoRow}>
          <span className={styles.label}>Текущий узел</span>

          <span>
            {courier.current_node
              ? courier.current_node.name
              : 'Не указан'}
          </span>
        </div>
      </div>

      <button
        className={styles.actionBtn}
        onClick={toggleStatus}
        disabled={loading}
      >
        {loading
          ? 'Обновление...'
          : courier.status === 'AVAILABLE'
          ? 'Сделать занятым'
          : 'Сделать доступным'}
      </button>
    </div>
  );
};

export const CouriersPage: React.FC = () => {
  const {
    data: couriers,
    loading,
    error,
    reload,
  } = useFetch(() => usersApi.couriers());

  const [filter, setFilter] = useState<string>('ALL');

  const filtered =
    couriers?.filter((c) => {
      if (filter === 'ALL') return true;
      return c.status === filter;
    }) ?? [];

  const handleStatusChange = async (
    id: number,
    status: CourierStatus,
  ) => {
    await usersApi.updateCourier(id, { status });
    await reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Курьеры</h1>

          <p className={styles.pageSubtitle}>
            Управление статусами курьеров
          </p>
        </div>

        <select
          className={styles.filterSelect}
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="ALL">Все</option>
          <option value="AVAILABLE">Доступные</option>
          <option value="BUSY">Занятые</option>
        </select>
      </div>

      {loading && (
        <p className={styles.loading}>
          Загрузка курьеров...
        </p>
      )}

      {error && (
        <p className={styles.error}>
          {error}
        </p>
      )}

      {!loading && !error && (
        <div className={styles.grid}>
          {filtered.map((courier) => (
            <CourierCard
              key={courier.id}
              courier={courier}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
};