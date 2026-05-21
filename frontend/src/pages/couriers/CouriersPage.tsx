import React, { useState } from "react";
import { usersApi } from "../../api";
import { useFetch } from "../../hooks/useFetch";
import CourierCard from "./components/CourierCard";
import type { CourierStatus } from "../../types";
import styles from "./CouriersPage.module.css";


export const CouriersPage: React.FC = () => {
  const {
    data: couriers,
    loading,
    error,
    reload,
  } = useFetch(() => usersApi.couriers());

  const [filter, setFilter] = useState<string>("ALL");

  const filtered =
    couriers?.filter((c) => {
      if (filter === "ALL") return true;
      return c.status === filter;
    }) ?? [];

  const handleStatusChange = async (id: number, status: CourierStatus) => {
    await usersApi.updateCourier(id, { status });
    await reload();
  };

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Курьеры</h1>

          <p className={styles.pageSubtitle}>Управление статусами курьеров</p>
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

      {loading && <p className={styles.loading}>Загрузка курьеров...</p>}

      {error && <p className={styles.error}>{error}</p>}

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
