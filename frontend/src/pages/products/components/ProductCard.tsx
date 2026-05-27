import { useState } from 'react';
import { api } from '../../../patterns/proxy/ApiProxy';
import type { Product } from '../../../types';
import styles from '../ProductsPage.module.css';

const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const [loading, setLoading] = useState(false);

  const addToCart = async () => {
    try {
      setLoading(true);

      await api.post('/cart/', {
        product_id: product.id,
        quantity: 1,
      });
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
          disabled={loading}
        >
          {loading ? 'Добавление...' : 'В корзину'}
        </button>
      </div>
    </div>
  );
};

export default ProductCard;