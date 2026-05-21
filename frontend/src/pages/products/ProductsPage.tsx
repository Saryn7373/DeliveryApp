import React, { useEffect, useMemo, useState } from 'react';
import { productsApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Product, Store } from '../../types';
import ProductCard from './components/ProductCard';
import styles from './ProductsPage.module.css';

type ProductWithStore = Product & {
  storeData: Store;
};

export const ProductsPage: React.FC = () => {
  const {
    data: stores,
    loading,
    error,
  } = useFetch<Store[]>(() => productsApi.stores());

  const [products, setProducts] = useState<ProductWithStore[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');

  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!stores?.length) return;

    let cancelled = false;

    const load = async () => {
      setProductsLoading(true);

      try {
        const detailedStores = await Promise.all(
          stores.map((store) => productsApi.store(store.id)),
        );

        if (cancelled) return;

        const merged: ProductWithStore[] = detailedStores.flatMap((store) =>
          store.products.map((product) => ({
            ...product,
            storeData: store,
          })),
        );

        setProducts(merged);
      } finally {
        if (!cancelled) {
          setProductsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [stores]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesStore =
        selectedStoreId === 'all'
          ? true
          : product.storeData.id === selectedStoreId;

      const matchesSearch =
        product.name.toLowerCase().includes(search.toLowerCase()) ||
        product.storeData.name.toLowerCase().includes(search.toLowerCase());

      return matchesStore && matchesSearch;
    });
  }, [products, selectedStoreId, search]);

  if (loading || productsLoading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerMessage}>
          Загрузка каталога...
        </div>
      </div>
    );
  }

  if (error || !stores) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>
            Каталог товаров
          </h1>

          <p className={styles.subtitle}>
            Выберите магазин и найдите нужный товар
          </p>
        </div>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск товаров или магазинов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${
            selectedStoreId === 'all'
              ? styles.filterButtonActive
              : ''
          }`}
          onClick={() => setSelectedStoreId('all')}
        >
          Все магазины
        </button>

        {stores.map((store) => (
          <button
            key={store.id}
            className={`${styles.filterButton} ${
              selectedStoreId === store.id
                ? styles.filterButtonActive
                : ''
            }`}
            onClick={() => setSelectedStoreId(store.id)}
          >
            {store.name}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div className={styles.empty}>
          Ничего не найдено
        </div>
      ) : (
        <div className={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <ProductCard product={product} />
          ))}
        </div>
      )}
    </div>
  );
};