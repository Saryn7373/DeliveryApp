import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../patterns/proxy/ApiProxy";
import { usersApi } from "../../api";
import type { DeliveryAddress } from "../../types";
import styles from "./CartPage.module.css";

interface CartItem {
  id: number;
  quantity: number;
  price_at_order: string;
  product: {
    id: number;
    name: string;
    description: string;
    price: string;
  };
}

interface Cart {
  id: number | null;
  total_price: string;
  items: CartItem[];
}

export const CartPage: React.FC = () => {
  const {
    data: cart,
    loading,
    error,
    reload,
  } = useFetch<Cart>(() => api.get("/cart/"));
    const navigate = useNavigate()
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | "">("");

  React.useEffect(() => {
    const loadAddresses = async () => {
      try {
        const customers = await usersApi.customers();

        if (!customers.length) return;

        const customer = customers[0];

        const data = await usersApi.customerAddresses(customer.id);

        setAddresses(data);

        if (data.length > 0) {
          setSelectedAddress(data[0].id);
        }
      } catch (e) {
        console.error(e);
      }
    };

    loadAddresses();
  }, []);
  const removeItem = async (itemId: number) => {
    try {
      await api.delete(`/cart/items/${itemId}/`);
      reload();
    } catch (e) {
      console.error(e);
    }
  };
  const checkout = async () => {
    try {
        await api.post('/cart/checkout/', {
        delivery_address_id: 1,
        });
        navigate('/orders')
        reload();
    } catch (e) {
        console.error(e);
    }
    };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.centerMessage}>Загрузка корзины...</div>
      </div>
    );
  }

  if (error || !cart) {
    return (
      <div className={styles.page}>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  const isEmpty = cart.items.length === 0;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Корзина</h1>
          <p className={styles.subtitle}>
            Ваши товары перед оформлением заказа
          </p>
        </div>
      </div>

      {isEmpty ? (
        <div className={styles.empty}>
          <h2 className={styles.emptyTitle}>Корзина пуста</h2>

          <p className={styles.emptyText}>Добавьте товары из каталога</p>

          <Link to="/products" className={styles.catalogButton}>
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.items}>
            {cart.items.map((item) => (
              <div key={item.id} className={styles.card}>
                <div className={styles.cardContent}>
                  <div>
                    <h3 className={styles.productName}>{item.product.name}</h3>

                    {item.product.description && (
                      <p className={styles.description}>
                        {item.product.description}
                      </p>
                    )}
                  </div>

                  <div className={styles.meta}>
                    <span className={styles.quantity}>× {item.quantity}</span>

                    <span className={styles.price}>
                      {parseFloat(item.price_at_order).toFixed(2)} ₽
                    </span>
                  </div>
                </div>

                <button
                  className={styles.removeButton}
                  onClick={() => removeItem(item.id)}
                >
                  Удалить
                </button>
              </div>
            ))}
          </div>

          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Итого</h2>

            <div className={styles.summaryRow}>
              <span>Товаров</span>
              <span>{cart.items.length}</span>
            </div>

            <div className={styles.summaryRowTotal}>
              <span>Сумма</span>
              <span>{parseFloat(cart.total_price).toFixed(2)} ₽</span>
            </div>
            {/* <select
              className={styles.addressSelect}
              value={selectedAddress}
              onChange={(e) => setSelectedAddress(Number(e.target.value))}
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.street_address}
                </option>
              ))}
            </select> */}
            <button className={styles.checkoutButton} onClick={checkout}>
              Оформить заказ
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
