import { useState } from 'react';
import { cartApi } from '../../../api';
import type { Product } from '../../../types';
import styles from '../ProductsPage.module.css';

interface Props {
  product: Product;
  storeName: string;
  cartQuantity: number;
  onCartChange: () => void;
}

const ProductCard: React.FC<Props> = ({ product, storeName, cartQuantity, onCartChange }) => {
  const effectiveStock = Math.max(0, product.stock_qty - cartQuantity);
  const outOfStock = effectiveStock === 0;
  const lowStock = effectiveStock > 0 && effectiveStock < 5;

  const [loading, setLoading] = useState(false);
  const [added, setAdded] = useState(false);

  const addToCart = async () => {
    if (outOfStock || loading) return;
    try {
      setLoading(true);
      await cartApi.add(product.id, 1);
      onCartChange();
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.productCard}>
      <div className={styles.productTop}>
        <h3 className={styles.productName}>{product.name}</h3>

        {outOfStock ? (
          <span className={`${styles.stockBadge} ${styles.outOfStock}`}>Нет в наличии</span>
        ) : lowStock ? (
          <span className={`${styles.stockBadge} ${styles.lowStock}`}>Осталось {effectiveStock} шт.</span>
        ) : (
          <span className={`${styles.stockBadge} ${styles.inStock}`}>В наличии</span>
        )}
      </div>

      <p className={styles.storeLabel}>🏪 {storeName}</p>

      {product.description && (
        <p className={styles.productDescription}>{product.description}</p>
      )}

      <div className={styles.productBottom}>
        <span className={styles.price}>{parseFloat(product.price).toFixed(2)} ₽</span>

        <button
          className={styles.addButton}
          onClick={addToCart}
          disabled={loading || outOfStock}
        >
          {outOfStock ? 'Недоступно' : loading ? '...' : added ? 'Добавлено ✓' : 'В корзину'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
