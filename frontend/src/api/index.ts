import { api } from '../patterns/proxy/ApiProxy';
import type {
  Order,
  OrderListItem,
  OrderItem,
  Courier,
  Customer,
  DeliveryAddress,
  Store,
  Product,
  ShortestPathResponse,
} from '../types';

// ─── Orders 
export const ordersApi = {
  list: (params?: { status?: string; customer?: number; courier?: number }) =>
    api.get<OrderListItem[]>('/orders/', params as Record<string, string | number | undefined>),

  get: (id: number) => api.get<Order>(`/orders/${id}/`),

  create: (data: { customer: number; store: number; delivery_address: number }) =>
    api.post<Order>('/orders/', data),

  addItem: (orderId: number, data: { product: number; quantity: number }) =>
    api.post<OrderItem>(`/orders/${orderId}/add_item/`, data),

  removeItem: (orderId: number, itemId: number) =>
    api.delete(`/orders/${orderId}/items/${itemId}/`),

  assignCourier: (orderId: number, courierId: number) =>
    api.post<Order>(`/orders/${orderId}/assign_courier/`, { courier_id: courierId }),

  transition: (orderId: number, status: string) =>
    api.post<Order>(`/orders/${orderId}/transition/`, { status }),
};

// ─── Products 
export const productsApi = {
  stores: () => api.get<Store[]>('/products/stores/'),
  store: (id: number) => api.get<Store>(`/products/stores/${id}/`),
  products: (storeId?: number) =>
    api.get<Product[]>('/products/products/', storeId ? { store: storeId } : undefined),
  product: (id: number) => api.get<Product>(`/products/products/${id}/`),
};

// ─── Users
export const usersApi = {
  customers: () => api.get<Customer[]>('/users/customers/'),
  customer: (id: number) => api.get<Customer>(`/users/customers/${id}/`),
  addresses: () => api.get<DeliveryAddress[]>('/users/addresses/'),

  couriers: () => api.get<Courier[]>('/users/couriers/'),
  courier: (id: number) => api.get<Courier>(`/users/couriers/${id}/`),
  updateCourier: (id: number, data: { status?: string; current_node?: number }) =>
    api.patch<Courier>(`/users/couriers/${id}/`, data),
};

// ─── Routing 
export const routingApi = {
  shortestPath: (fromNode: number, toNode: number) =>
    api.post<ShortestPathResponse>('/routing/shortest-path/', {
      from_node: fromNode,
      to_node: toNode,
    }),
};