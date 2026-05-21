import { createBrowserRouter } from 'react-router-dom';

import { Layout } from '../components/layout/Layout';

import { OrdersPage } from '../pages/orders/OrdersPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { CouriersPage } from '../pages/couriers/CouriersPage';
import { RoutingPage } from '../pages/routing/RoutingPage';

import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { ProtectedRoute } from '../auth/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },

  {
    path: '/',
    element: (
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    ),

    children: [
      {
        path: 'orders',
        element: <OrdersPage />,
      },

      {
        path: 'products',
        element: <ProductsPage />,
      },

      {
        path: 'couriers',
        element: <CouriersPage />,
      },

      {
        path: 'routing',
        element: <RoutingPage />,
      },
    ],
  },
]);