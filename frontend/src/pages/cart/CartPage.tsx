import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi, ordersApi, productsApi, usersApi } from '../../api';
import { useFetch } from '../../hooks/useFetch';
import type { Cart, DeliveryAddress, Store } from '../../types';
import styles from './CartPage.module.css';

export const CartPage: React.FC = () => {
  const { data: stores } = useFetch<Store[]>(() => productsApi.stores());
  const navigate = useNavigate();

  // Управляем корзиной локально, чтобы не мигать loading при каждом изменении
  const [cart, setCart] = useState<Cart | null>(null);
  const [cartLoading, setCartLoading] = useState(true);
  const [cartError, setCartError] = useState<string | null>(null);

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | ''>('');
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const getStoreName = (storeId: number | undefined) =>
    storeId ? (stores?.find((s) => s.id === storeId)?.name ?? '') : '';

  const loadCart = useCallback(async () => {
    try {
      const data = await cartApi.get();
      setCart(data);
      setCartError(null);
    } catch (e: any) {
      setCartError(e?.detail ?? 'Ошибка загрузки корзины');
    } finally {
      setCartLoading(false);
    }
  }, []);

  useEffect(() => { loadCart(); }, [loadCart]);

  useEffect(() => {
    usersApi.addresses()
      .then((data) => {
        setAddresses(data);
        if (data.length > 0) setSelectedAddress(data[0].id);
      })
      .catch(console.error);
  }, []);

  const updateQty = async (itemId: number, newQty: number) => {
    try {
      if (newQty <= 0) {
        await cartApi.removeItem(itemId);
        // Обновляем локально без перерисовки всей страницы
        setCart((prev) => {
          if (!prev) return prev;
          const items = prev.items.filter((i) => i.id !== itemId);
          const total = items.reduce((s, i) => s + parseFloat(i.price_at_order) * i.quantity, 0);
          return { ...prev, items, total_price: total.toFixed(2) };
        });
      } else {
        const updated = await cartApi.updateItem(itemId, newQty);
        // Сортируем items по id чтобы порядок был стабильным
        setCart({ ...updated, items: [...updated.items].sort((a, b) => a.id - b.id) });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const clearCart = async () => {
    if (!cart?.items.length) return;
    try {
      await Promise.all(cart.items.map((item) => cartApi.removeItem(item.id)));
      setCart((prev) => prev ? { ...prev, items: [], total_price: '0.00' } : prev);
    } catch (e) {
      console.error(e);
    }
  };

  const checkout = async () => {
    if (!selectedAddress) {
      setCheckoutError('Выберите адрес доставки');
      return;
    }
    try {
      setCheckoutError(null);
      setCheckoutLoading(true);
      const order = await cartApi.checkout(selectedAddress as number);
      ordersApi.demoProgress(order.id).catch(console.error);
      navigate('/orders', { state: { newOrderId: order.id } });
    } catch (e: any) {
      setCheckoutError(e?.detail ?? e?.message ?? 'Ошибка при оформлении заказа');
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (cartLoading) {
    return <div className={styles.page}><div className={styles.centerMessage}>Загрузка корзины...</div></div>;
  }
  if (cartError || !cart) {
    return <div className={styles.page}><div className={styles.error}>{cartError}</div></div>;
  }

  // Стабильный порядок — по id
  const sortedItems = [...cart.items].sort((a, b) => a.id - b.id);
  const isEmpty = sortedItems.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.subtitle}>Ваши товары перед оформлением заказа</p>
        </div>
        {!isEmpty && (
          <button className={styles.clearButton} onClick={clearCart}>
            Очистить корзину
          </button>
        )}
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Корзина пуста</h2>
          <p className={styles.emptyText}>Добавьте товары из каталога</p>
          <Link to="/products" className={styles.catalogButton}>Перейти в каталог</Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.items}>
            {sortedItems.map((item) => {
              const remaining = item.product.stock_qty - item.quantity;
              return (
                <div key={item.id} className={styles.card}>
                  <div className={styles.cardContent}>
                    <div className={styles.productInfo}>
                      <h3 className={styles.productName}>{item.product.name}</h3>
                      {getStoreName(item.product.store) && (
                        <span className={styles.cartStoreLabel}>
                          🏪 {getStoreName(item.product.store)}
                        </span>
                      )}
                      {item.product.stock_qty === 0 ? (
                        <span className={styles.outOfStockNote}>Нет в наличии</span>
                      ) : remaining <= 0 ? (
                        <span className={styles.outOfStockNote}>Больше не добавить</span>
                      ) : remaining < 5 ? (
                        <span className={styles.lowStockNote}>Можно добавить ещё {remaining} шт.</span>
                      ) : null}
                    </div>

                    <div className={styles.meta}>
                      <div className={styles.qtyControl}>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => updateQty(item.id, item.quantity - 1)}
                        >−</button>
                        <span className={styles.qtyDisplay}>{item.quantity}</span>
                        <button
                          className={styles.qtyBtn}
                          onClick={() => updateQty(item.id, item.quantity + 1)}
                          disabled={remaining <= 0}
                        >+</button>
                      </div>

                      <span className={styles.price}>
                        {(parseFloat(item.price_at_order) * item.quantity).toFixed(2)} ₽
                      </span>
                    </div>
                  </div>

                  <button
                    className={styles.removeButton}
                    onClick={() => updateQty(item.id, 0)}
                    title="Удалить позицию"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Итого</h2>

            <div className={styles.summaryRow}>
              <span>Позиций</span>
              <span>{sortedItems.length}</span>
            </div>
            <div className={styles.summaryRow}>
              <span>Товаров</span>
              <span>{sortedItems.reduce((s, i) => s + i.quantity, 0)} шт.</span>
            </div>
            <div className={styles.summaryRowTotal}>
              <span>Сумма</span>
              <span>{parseFloat(cart.total_price).toFixed(2)} ₽</span>
            </div>

            {addresses.length > 0 ? (
              <select
                className={styles.addressSelect}
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(Number(e.target.value))}
              >
                {addresses.map((a) => (
                  <option key={a.id} value={a.id}>{a.street_address}</option>
                ))}
              </select>
            ) : (
              <p className={styles.noAddress}>Нет сохранённых адресов доставки</p>
            )}

            {checkoutError && (
              <p className={styles.checkoutError}>{checkoutError}</p>
            )}

            <button
              className={styles.checkoutButton}
              onClick={checkout}
              disabled={checkoutLoading || addresses.length === 0}
            >
              {checkoutLoading ? 'Оформляем...' : 'Оформить заказ'}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
