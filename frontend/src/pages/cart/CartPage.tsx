import React from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { api } from "../../patterns/proxy/ApiProxy";
import { usersApi } from "../../api";
import type { DeliveryAddress } from "../../types";
import styles from "./CartPage.module.css";

interface CartItemProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  stock_qty: number;
}

interface CartItem {
  id: number;
  quantity: number;
  price_at_order: string;
  product: CartItemProduct;
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
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | "">("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  React.useEffect(() => {
    const loadAddresses = async () => {
      try {
        const data = await usersApi.addresses();
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
    if (!selectedAddress) {
      setCheckoutError("Выберите адрес доставки");
      return;
    }
    try {
      setCheckoutError(null);
      setCheckoutLoading(true);
      await api.post("/cart/checkout/", {
        delivery_address_id: selectedAddress,
      });
      navigate("/orders");
    } catch (e: any) {
      const message =
        e?.detail ?? e?.message ?? "Ошибка при оформлении заказа";
      setCheckoutError(message);
    } finally {
      setCheckoutLoading(false);
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

            {addresses.length > 0 && (
              <select
                className={styles.addressSelect}
                value={selectedAddress}
                onChange={(e) => setSelectedAddress(Number(e.target.value))}
              >
                {addresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.street_address}
                  </option>
                ))}
              </select>
            )}

            {addresses.length === 0 && (
              <p style={{ marginTop: 16, fontSize: 14, color: "#dc2626" }}>
                Нет сохранённых адресов доставки
              </p>
            )}

            {checkoutError && (
              <p style={{ marginTop: 12, fontSize: 14, color: "#dc2626", background: "#fee2e2", padding: "10px 14px", borderRadius: 8 }}>
                {checkoutError}
              </p>
            )}

            <button
              className={styles.checkoutButton}
              onClick={checkout}
              disabled={checkoutLoading || addresses.length === 0}
            >
              {checkoutLoading ? "Оформляем..." : "Оформить заказ"}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
};
