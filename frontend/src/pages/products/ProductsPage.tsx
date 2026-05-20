import React, { useMemo, useState } from 'react';
import { productsApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Product, Store } from '../../types';
import styles from './ProductsPage.module.css';

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const stockClass =
    product.stock_qty === 0
      ? styles.outOfStock
      : product.stock_qty < 10
      ? styles.lowStock
      : styles.inStock;

  return (
    <div className={styles.productCard}>
      <div className={styles.productTop}>
        <h3 className={styles.productName}>{product.name}</h3>

        <span className={`${styles.stockBadge} ${stockClass}`}>
          {product.stock_qty === 0
            ? 'Нет в наличии'
            : `Остаток: ${product.stock_qty}`}
        </span>
      </div>

      {product.description && (
        <p className={styles.productDescription}>
          {product.description}
        </p>
      )}

      <div className={styles.productBottom}>
        <span className={styles.price}>
          {parseFloat(product.price).toFixed(2)} ₽
        </span>
      </div>
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const {
    data: stores,
    loading,
    error,
  } = useFetch<Store[]>(() => productsApi.stores());

  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const selectedStore = useMemo(() => {
    if (!stores || selectedStoreId === null) return null;

    return stores.find((s) => s.id === selectedStoreId) ?? null;
  }, [stores, selectedStoreId]);

  const filteredProducts = useMemo(() => {
    if (!selectedStore?.products) return [];

    return selectedStore.products.filter((p) =>
      p.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [selectedStore, search]);

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

                <div className={styles.storeAddress}>
                  {store.address}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* CONTENT */}
        <section className={styles.content}>
          {!selectedStore ? (
            <div className={styles.emptyState}>
              Выберите магазин
            </div>
          ) : (
            <>
              <div className={styles.contentHeader}>
                <div>
                  <h2 className={styles.selectedStoreTitle}>
                    {selectedStore.name}
                  </h2>

                  <p className={styles.selectedStoreAddress}>
                    {selectedStore.address}
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
                  Товары не найдены
                </div>
              ) : (
                <div className={styles.productsGrid}>
                  {filteredProducts.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
};