
import type { Product } from '../../../types';
import styles from '../ProductsPage.module.css';



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
        <p className={styles.productDescription}>{product.description}</p>
      )}
      <div className={styles.productBottom}>
        <span className={styles.price}>
          {parseFloat(product.price).toFixed(2)} ₽
        </span>
      </div>
    </div>
  );
};

export default ProductCard