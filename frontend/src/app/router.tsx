import { createBrowserRouter } from 'react-router-dom';

import { Layout } from '../components/layout/Layout';

import { OrdersPage } from '../pages/orders/OrdersPage';
import { ProductsPage } from '../pages/products/ProductsPage';
import { CouriersPage } from '../pages/couriers/CouriersPage';
import { RoutingPage } from '../pages/routing/RoutingPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
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