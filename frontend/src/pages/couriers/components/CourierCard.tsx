import React, { useState } from "react";
import type { Courier, CourierStatus } from "../../../types";
import styles from "../CouriersPage.module.css";


const STATUS_LABELS: Record<CourierStatus, string> = {
  AVAILABLE: "Доступен",
  BUSY: "Занят",
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
      courier.status === "AVAILABLE" ? "BUSY" : "AVAILABLE";

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

          <p className={styles.username}>@{courier.user.username}</p>
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
            {courier.current_node ? courier.current_node.name : "Не указан"}
          </span>
        </div>
      </div>

      <button
        className={styles.actionBtn}
        onClick={toggleStatus}
        disabled={loading}
      >
        {loading
          ? "Обновление..."
          : courier.status === "AVAILABLE"
            ? "Сделать занятым"
            : "Сделать доступным"}
      </button>
    </div>
  );
};

export default CourierCard