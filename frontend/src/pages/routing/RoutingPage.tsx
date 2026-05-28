import React, { useState } from "react";
import { productsApi, routingApi, usersApi } from "../../api";
import { useFetch } from "../../hooks/useFetch";
import type {
  DeliveryAddress,
  ShortestPathResponse,
  Store,
} from "../../types";
import styles from "./RoutingPage.module.css";

const NODE_TYPE_LABEL: Record<string, string> = {
  STORE: "Магазин",
  INTERSECTION: "Перекрёсток",
  ADDRESS: "Адрес доставки",
};

interface RouteResult {
  store: Store;
  route: ShortestPathResponse;
}

export const RoutingPage: React.FC = () => {
  const { data: stores, loading: storesLoading, error: storesError } =
    useFetch<Store[]>(() => productsApi.stores());

  const { data: addresses, loading: addressesLoading, error: addressesError } =
    useFetch<DeliveryAddress[]>(() => usersApi.addresses());

  const [selectedAddress, setSelectedAddress] = useState<number | "">("");

  const [best, setBest] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildRoute = async () => {
    setError(null);
    setBest(null);

    if (!selectedAddress || !stores?.length) {
      setError("Выберите адрес доставки");
      return;
    }

    const address = addresses?.find((a) => a.id === selectedAddress);
    if (!address) {
      setError("Адрес не найден");
      return;
    }

    setLoadingRoute(true);

    try {
      const results = await Promise.allSettled(
        stores.map(async (store) => {
          const route = await routingApi.shortestPath(store.node, address.node.id);
          return { store, route } as RouteResult;
        })
      );

      const successful = results
        .filter((r): r is PromiseFulfilledResult<RouteResult> => r.status === "fulfilled")
        .map((r) => r.value);

      if (successful.length === 0) {
        setError("Маршруты не найдены ни от одного магазина");
        return;
      }

      const nearest = successful.reduce((min, cur) =>
        cur.route.total_weight < min.route.total_weight ? cur : min
      );

      setBest(nearest);
    } catch (e: any) {
      setError(e?.detail ?? String(e));
    } finally {
      setLoadingRoute(false);
    }
  };

  const loading = storesLoading || addressesLoading;
  const apiError = storesError || addressesError;
  const selectedAddressObj = addresses?.find((a) => a.id === selectedAddress);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Маршруты доставки</h1>
        <p className={styles.pageSubtitle}>
          Автоматический подбор ближайшего магазина до адреса доставки
        </p>
      </div>

      {loading && <p className={styles.loading}>Загрузка данных...</p>}
      {apiError && <p className={styles.error}>{apiError}</p>}

      {!loading && !apiError && (
        <>
          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.stepNum}>1</span> Адрес доставки
              </label>
              <select
                className={styles.select}
                value={selectedAddress}
                onChange={(e) => {
                  setSelectedAddress(Number(e.target.value));
                  setBest(null);
                  setError(null);
                }}
              >
                <option value="">Выберите адрес</option>
                {addresses?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.street_address}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.field} style={{ gridColumn: "2 / 5" }}>
              <label className={styles.label} style={{ visibility: "hidden" }}>
                &nbsp;
              </label>
              <button
                className={styles.buildBtn}
                onClick={buildRoute}
                disabled={loadingRoute || !selectedAddress}
              >
                {loadingRoute
                  ? `Проверяем ${stores?.length ?? 0} магазинов…`
                  : "Найти ближайший магазин"}
              </button>
            </div>
          </div>

          {selectedAddressObj && (
            <div className={styles.summary}>
              <span className={styles.summaryIcon}>📍</span>
              <div>
                <div className={styles.summaryLabel}>Адрес доставки</div>
                <div className={styles.summaryValue}>
                  {selectedAddressObj.street_address}
                </div>
              </div>
              <div className={styles.summaryArrow}>←</div>
              <span className={styles.summaryIcon}>🏪</span>
              <div>
                <div className={styles.summaryLabel}>Магазин</div>
                <div className={styles.summaryValue} style={{ color: "#9ca3af" }}>
                  {loadingRoute ? "Подбираем…" : best ? best.store.name : "Будет определён автоматически"}
                </div>
              </div>
            </div>
          )}

          {error && <div className={styles.errorBox}>{error}</div>}

          {best && (
            <div className={styles.routeCard}>
              <div className={styles.routeTop}>
                <div>
                  <h2 className={styles.routeTitle}>Ближайший маршрут</h2>
                  <p className={styles.routeStoreName}>
                    🏪 {best.store.name} — {best.store.address}
                  </p>
                </div>
                <span className={styles.distanceBadge}>
                  {(best.route.total_weight * 10).toFixed(3)} км
                </span>
              </div>

              <div className={styles.nodesList}>
                {best.route.path.map((node, index) => {
                  const isFirst = index === 0;
                  const isLast = index === best.route.path.length - 1;
                  return (
                    <div
                      key={node.id}
                      className={`${styles.nodeItem} ${
                        isFirst ? styles.nodeFirst :
                        isLast  ? styles.nodeLast  : ""
                      }`}
                    >
                      <div className={styles.nodeIndex}>{index + 1}</div>
                      <div className={styles.nodeInfo}>
                        <div className={styles.nodeName}>{node.name}</div>
                        <div className={styles.nodeType}>
                          {NODE_TYPE_LABEL[node.type] ?? node.type}
                        </div>
                      </div>
                      {isFirst && <span className={styles.nodeTag}>Старт</span>}
                      {isLast && (
                        <span className={`${styles.nodeTag} ${styles.nodeTagEnd}`}>
                          Финиш
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
