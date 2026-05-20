import React, { useEffect, useState } from 'react';
import { productsApi, routingApi, usersApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';

import type {
  Customer,
  DeliveryAddress,
  ShortestPathResponse,
  Store,
} from '../../types';

import styles from './RoutingPage.module.css';

export const RoutingPage: React.FC = () => {
  const {
    data: stores,
    loading: storesLoading,
    error: storesError,
  } = useFetch<Store[]>(() => productsApi.stores());

  const {
    data: customers,
    loading: customersLoading,
    error: customersError,
  } = useFetch<Customer[]>(() => usersApi.customers());

  const [selectedStore, setSelectedStore] = useState<number | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState<number | ''>('');
  const [selectedAddress, setSelectedAddress] = useState<number | ''>('');

  const [addresses, setAddresses] = useState<DeliveryAddress[] | null>(null);   
  const [route, setRoute] = useState<ShortestPathResponse | null>(null);

  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  
  // Загружаем адреса выбранного покупателя
    useEffect(() => {
    if (!selectedCustomer) return;

    usersApi
        .customerAddresses(Number(selectedCustomer))
        .then(setAddresses)
        .catch((e) => setError(String(e)));
    }, [selectedCustomer]);


  // Построение маршрута
  const buildRoute = async () => {
    setError(null);
    setRoute(null);

    if (!selectedStore || !selectedAddress) {
      setError('Выберите магазин и адрес доставки');
      return;
    }

    const store = stores?.find((s) => s.id === selectedStore);
    const address = (addresses ?? []).find((a) => a.id === selectedAddress);

    if (!store || !address) {
      setError('Некорректные данные маршрута');
      return;
    }

    setLoadingRoute(true);

    try {
      const result = await routingApi.shortestPath(
        store.node,
        address.node.id,
      );

      setRoute(result);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoadingRoute(false);
    }
  };

  const loading = storesLoading || customersLoading;
  const apiError = storesError || customersError;

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Маршруты доставки</h1>

        <p className={styles.pageSubtitle}>
          Поиск кратчайшего пути между магазином и адресом доставки
        </p>
      </div>

      {loading && (
        <p className={styles.loading}>
          Загрузка данных...
        </p>
      )}

      {apiError && (
        <p className={styles.error}>
          {apiError}
        </p>
      )}

      {!loading && !apiError && (
        <>
          <div className={styles.form}>
            {/* STORE */}
            <div className={styles.field}>
              <label className={styles.label}>
                Магазин
              </label>

              <select
                className={styles.select}
                value={selectedStore}
                onChange={(e) =>
                  setSelectedStore(Number(e.target.value))
                }
              >
                <option value="">Выберите магазин</option>

                {stores?.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>

            {/* CUSTOMER */}
            <div className={styles.field}>
              <label className={styles.label}>
                Покупатель
              </label>

              <select
                className={styles.select}
                value={selectedCustomer}
                onChange={(e) => {
                  setSelectedCustomer(Number(e.target.value));
                  setSelectedAddress('');
                }}
              >
                <option value="">Выберите покупателя</option>

                {customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.user.first_name}{' '}
                    {customer.user.last_name}
                  </option>
                ))}
              </select>
            </div>

            {/* ADDRESS */}
            <div className={styles.field}>
              <label className={styles.label}>
                Адрес доставки
              </label>

              <select
                className={styles.select}
                value={selectedAddress}
                onChange={(e) =>
                  setSelectedAddress(Number(e.target.value))
                }
                disabled={!(addresses ?? []).length}
              >
                <option value="">
                  Выберите адрес
                </option>

                {(addresses ?? []).map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.street_address}
                  </option>
                ))}
              </select>
            </div>

            <button
              className={styles.buildBtn}
              onClick={buildRoute}
              disabled={loadingRoute}
            >
              {loadingRoute
                ? 'Построение...'
                : 'Построить маршрут'}
            </button>
          </div>

          {error && (
            <div className={styles.errorBox}>
              {error}
            </div>
          )}

          {route && (
            <div className={styles.routeCard}>
              <div className={styles.routeTop}>
                <h2 className={styles.routeTitle}>
                  Найденный маршрут
                </h2>

                <span className={styles.distanceBadge}>
                  {route.total_weight.toFixed(2)}
                </span>
              </div>

              <div className={styles.nodesList}>
                {route.path.map((node, index) => (
                  <div
                    key={node.id}
                    className={styles.nodeItem}
                  >
                    <div className={styles.nodeIndex}>
                      {index + 1}
                    </div>

                    <div>
                      <div className={styles.nodeName}>
                        {node.name}
                      </div>

                      <div className={styles.nodeType}>
                        {node.type}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};