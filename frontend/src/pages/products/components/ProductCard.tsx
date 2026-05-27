import { useState } from 'react';
import { api } from '../../../patterns/proxy/ApiProxy';
import type { Product } from '../../../types';
import styles from '../ProductsPage.module.css';

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const outOfStock = product.stock_qty === 0;
  const lowStock = product.stock_qty > 0 && product.stock_qty < 5;

  const addToCart = async () => {
    if (outOfStock) return;
    try {
      setLoading(true);
      await api.post('/cart/', {
        product_id: product.id,
        quantity: 1,
      });
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.productCard}>
      <div className={styles.productTop}>
        <h3 className={styles.productName}>
          {product.name}
        </h3>

        {outOfStock ? (
          <span className={`${styles.stockBadge} ${styles.outOfStock}`}>
            Нет в наличии
          </span>
        ) : lowStock ? (
          <span className={`${styles.stockBadge} ${styles.lowStock}`}>
            Осталось {product.stock_qty} шт.
          </span>
        ) : (
          <span className={`${styles.stockBadge} ${styles.inStock}`}>
            В наличии
          </span>
        )}
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

        <button
          className={styles.addButton}
          onClick={addToCart}
          disabled={loading || outOfStock}
        >
          {outOfStock ? 'Недоступно' : loading ? 'Добавление...' : added ? 'Добавлено ✓' : 'В корзину'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
