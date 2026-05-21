import React, { useEffect, useMemo, useState } from 'react';
import { productsApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Product, Store } from '../../types';
import ProductCard from './components/ProductCard';
import styles from './ProductsPage.module.css';

type ProductWithStore = Product & {
  storeData: Store;
};

type StoreDetail = Store & {
  products?: Product[];
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
        const allProducts = await productsApi.products();

        if (cancelled) return;

        const merged: ProductWithStore[] = allProducts.map((product) => ({
          ...product,
          storeData: stores[0],
        }));

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
            Найдите нужный товар
          </p>
        </div>

        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.productsGrid}>
        {filteredProducts.length === 0 ? (
          <div className={styles.empty}>
            Ничего не найдено
          </div>
        ) : (
          filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))
        )}
      </div>
    </div>
  );
};