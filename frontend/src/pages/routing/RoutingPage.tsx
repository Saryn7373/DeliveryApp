import React, { useEffect, useState } from "react";
import { productsApi, routingApi, usersApi } from "../../api";
import { useFetch } from "../../hooks/useFetch";
import type {
  Customer,
  DeliveryAddress,
  ShortestPathResponse,
  Store,
} from "../../types";
import styles from "./RoutingPage.module.css";

const NODE_TYPE_LABEL: Record<string, string> = {
  STORE: "Магазин",
  ADDRESS: "Адрес доставки",
};

interface RouteResult {
  store: Store;
  route: ShortestPathResponse;
}

export const RoutingPage: React.FC = () => {
  const { data: stores, loading: storesLoading, error: storesError } =
    useFetch<Store[]>(() => productsApi.stores());

  const { data: customers, loading: customersLoading, error: customersError } =
    useFetch<Customer[]>(() => usersApi.customers());

  const [selectedCustomer, setSelectedCustomer] = useState<number | "">("");
  const [selectedAddress, setSelectedAddress] = useState<number | "">("");

  const [addresses, setAddresses] = useState<DeliveryAddress[] | null>(null);
  const [addressesLoading, setAddressesLoading] = useState(false);

  const [best, setBest] = useState<RouteResult | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загружаем адреса при выборе покупателя
  useEffect(() => {
    if (!selectedCustomer) return;

    let cancelled = false;
    setAddressesLoading(true);
    setAddresses(null);
    setSelectedAddress("");
    setBest(null);
    setError(null);

    usersApi
      .customerAddresses(Number(selectedCustomer))
      .then((data) => { if (!cancelled) setAddresses(data); })
      .catch((e) => { if (!cancelled) setError(String(e)); })
      .finally(() => { if (!cancelled) setAddressesLoading(false); });

    return () => { cancelled = true; };
  }, [selectedCustomer]);

  // Сбрасываем маршрут при смене адреса
  useEffect(() => {
    setBest(null);
    setError(null);
  }, [selectedAddress]);

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
      // Строим маршруты от всех магазинов параллельно
      const results = await Promise.allSettled(
        stores.map(async (store) => {
          const route = await routingApi.shortestPath(store.node, address.node.id);
          return { store, route } as RouteResult;
        })
      );

      // Фильтруем успешные и выбираем с минимальным весом
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

  const loading = storesLoading || customersLoading;
  const apiError = storesError || customersError;
  const selectedAddressObj = addresses?.find((a) => a.id === selectedAddress);

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Маршруты доставки</h1>
        <p className={styles.pageSubtitle}>
          Автоматический подбор ближайшего магазина до адреса покупателя
        </p>
      </div>

      {loading && <p className={styles.loading}>Загрузка данных...</p>}
      {apiError && <p className={styles.error}>{apiError}</p>}

      {!loading && !apiError && (
        <>
          <div className={styles.form}>
            {/* ШАГ 1 — Покупатель */}
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.stepNum}>1</span> Покупатель
              </label>
              <select
                className={styles.select}
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(Number(e.target.value));
                  setSelectedAddress("");
                  setBest(null);
                }}
              >
                <option value="">Выберите покупателя</option>
                {customers?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.user.first_name} {c.user.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ШАГ 2 — Адрес */}
            <div className={styles.field}>
              <label className={styles.label}>
                <span className={styles.stepNum}>2</span> Адрес доставки
              </label>
              <select
                className={styles.select}
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(Number(e.target.value))}
                disabled={!selectedCustomer || addressesLoading}
              >
                <option value="">
                  {addressesLoading
                    ? "Загрузка адресов…"
                    : !selectedCustomer
                    ? "Сначала выберите покупателя"
                    : "Выберите адрес"}
                </option>
                {addresses?.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.street_address}
                  </option>
                ))}
              </select>
            </div>

            {/* Кнопка — занимает оставшиеся колонки */}
            <div className={styles.field} style={{ gridColumn: "3 / 5" }}>
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

          {/* Сводка адреса */}
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