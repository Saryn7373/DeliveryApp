import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { cartApi, productsApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Product, Store } from '../../types';
import ProductCard from './components/ProductCard';
import styles from './ProductsPage.module.css';

type ProductWithStore = Product & { storeData: Store };

export const ProductsPage: React.FC = () => {
  const { data: stores, loading, error } = useFetch<Store[]>(() => productsApi.stores());

  const [products, setProducts] = useState<ProductWithStore[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [selectedStoreId, setSelectedStoreId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');

  // productId → количество в корзине
  const [cartMap, setCartMap] = useState<Record<number, number>>({});

  const refreshCart = useCallback(async () => {
    try {
      const cart = await cartApi.get();
      const map: Record<number, number> = {};
      (cart.items ?? []).forEach((item) => {
        map[item.product.id] = item.quantity;
      });
      setCartMap(map);
    } catch {
      // пустая корзина — ок
    }
  }, []);

  useEffect(() => {
    if (!stores?.length) return;
    let cancelled = false;
    const load = async () => {
      setProductsLoading(true);
      try {
        const all = await productsApi.products();
        if (cancelled) return;
        setProducts(
          all.map((p) => ({
            ...p,
            storeData: stores.find((s) => s.id === p.store) ?? stores[0],
          })),
        );
      } finally {
        if (!cancelled) setProductsLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [stores]);

  useEffect(() => { refreshCart(); }, [refreshCart]);

  const filtered = useMemo(() =>
    products.filter((p) => {
      const matchStore = selectedStoreId === 'all' || p.store === selectedStoreId;
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.storeData.name.toLowerCase().includes(search.toLowerCase());
      return matchStore && matchSearch;
    }),
  [products, selectedStoreId, search]);

  if (loading || productsLoading) {
    return <div className={styles.page}><div className={styles.centerMessage}>Загрузка каталога...</div></div>;
  }
  if (error || !stores) {
    return <div className={styles.page}><div className={styles.error}>{error}</div></div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div>
          <h1 className={styles.title}>Каталог товаров</h1>
          <p className={styles.subtitle}>Найдите нужный товар</p>
        </div>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Поиск товаров..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className={styles.filters}>
        <button
          className={`${styles.filterButton} ${selectedStoreId === 'all' ? styles.filterButtonActive : ''}`}
          onClick={() => setSelectedStoreId('all')}
        >
          Все магазины
        </button>
        {stores.map((store) => (
          <button
            key={store.id}
            className={`${styles.filterButton} ${selectedStoreId === store.id ? styles.filterButtonActive : ''}`}
            onClick={() => setSelectedStoreId(store.id)}
          >
            {store.name}
          </button>
        ))}
      </div>

      <div className={styles.productsGrid}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>Ничего не найдено</div>
        ) : (
          filtered.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              storeName={product.storeData.name}
              cartQuantity={cartMap[product.id] ?? 0}
              onCartChange={refreshCart}
            />
          ))
        )}
      </div>
    </div>
  );
};
