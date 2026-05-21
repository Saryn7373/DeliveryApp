import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import styles from './Layout.module.css';

const NAV_ITEMS = [
  { to: '/orders', label: 'Заказы', icon: '📦' },
  { to: '/products', label: 'Магазины', icon: '🏪' },
  { to: '/couriers', label: 'Курьеры', icon: '🛵' },
  { to: '/routing', label: 'Маршруты', icon: '🗺️' },
];

export const Layout: React.FC = () => (
  <div className={styles.root}>
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>X5</span>
        <span className={styles.logoSub}>Доставка</span>
      </div>
      <nav className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `${styles.navLink} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{icon}</span>
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <div className={styles.sidebarFooter}>
        <span className={styles.patternBadge}>Proxy · Composite · Iterator</span>
      </div>
    </aside>

    <main className={styles.main}>
      <Outlet />
    </main>
  </div>
);