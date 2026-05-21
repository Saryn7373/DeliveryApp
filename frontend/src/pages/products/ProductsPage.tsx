import React, { useEffect, useMemo, useState } from 'react';
import { productsApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Store } from '../../types';
import ProductCard from './components/ProductCard';
import styles from './ProductsPage.module.css';



export const ProductsPage: React.FC = () => {
  const { data: stores, loading, error } = useFetch<Store[]>(
    () => productsApi.stores(),
  );

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [storeDetail, setStoreDetail] = useState<Store | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (selectedStoreId === null) return;

    let cancelled = false;

    setDetailLoading(true);
    setDetailError(null);
    setStoreDetail(null);
    setSearch('');

    productsApi
      .store(selectedStoreId)
      .then((data) => { if (!cancelled) setStoreDetail(data); })
      .catch((e) => { if (!cancelled) setDetailError(String(e)); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });

    return () => { cancelled = true; };
  }, [selectedStoreId]);

  const filteredProducts = useMemo(() => {
    if (!storeDetail?.products) return [];
    return storeDetail.products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [storeDetail, search]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка магазинов…</p>
      </div>
    );
  }

  if (error || !stores) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error}</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Магазины и товары</h1>
      </div>

      <div className={styles.layout}>
        {/* SIDEBAR */}
        <aside className={styles.sidebar}>
          <h2 className={styles.sidebarTitle}>Магазины</h2>
          <div className={styles.storeList}>
            {stores.map((store) => (
              <button
                key={store.id}
                className={`${styles.storeCard} ${
                  selectedStoreId === store.id ? styles.storeCardActive : ''
                }`}
                onClick={() => setSelectedStoreId(store.id)}
              >
                <div className={styles.storeName}>{store.name}</div>
                <div className={styles.storeAddress}>{store.address}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className={styles.content}>
          {!selectedStoreId ? (
            <div className={styles.emptyState}>Выберите магазин</div>
          ) : detailLoading ? (
            <div className={styles.emptyState}>Загрузка товаров…</div>
          ) : detailError ? (
            <div className={styles.emptyState} style={{ color: '#dc2626' }}>
              {detailError}
            </div>
          ) : storeDetail ? (
            <>
              <div className={styles.contentHeader}>
                <div>
                  <h2 className={styles.selectedStoreTitle}>
                    {storeDetail.name}
                  </h2>
                  <p className={styles.selectedStoreAddress}>
                    {storeDetail.address}
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Поиск товара..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {filteredProducts.length === 0 ? (
                <div className={styles.emptyProducts}>
                  {search ? `Ничего не найдено по «${search}»` : 'В этом магазине нет товаров'}
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </>
          ) : null}
        </section>
      </div>
    </div>
  );
};