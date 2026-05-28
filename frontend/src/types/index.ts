// Routing
export type NodeType = 'STORE' | 'INTERSECTION' | 'ADDRESS';

export interface Node {
  id: number;
  name: string;
  type: NodeType;
  latitude: number | null;
  longitude: number | null;
}

export interface Edge {
  id: number;
  from_node: number;
  to_node: number;
  weight: number;
}

export interface ShortestPathResponse {
  path: Node[];
  total_weight: number;
}

// Products
export interface Product {
  id: number;
  name: string;
  description: string;
  price: string;
  store: number;
  stock_qty: number;
}

export interface Store {
  id: number;
  name: string;
  address: string;
  node: number;
}

// Users
export interface UserBrief {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface Customer {
  id: number;
  user: UserBrief;
  phone: string;
}

export interface DeliveryAddress {
  id: number;
  street_address: string;
  node: Node;
}

export type CourierStatus = 'AVAILABLE' | 'BUSY';

export interface Courier {
  id: number;
  user: UserBrief;
  phone: string;
  status: CourierStatus;
  current_node: Node | null;
}

// Orders
export type OrderStatus =
  | 'DRAFT'
  | 'ASSEMBLING'
  | 'COURIER_SELECTION'
  | 'DELIVERY'
  | 'COMPLETED'
  | 'CANCELLED';

export interface OrderItem {
  id: number;
  product: Product;
  quantity: number;
  price_at_order: string;
}

export interface RouteNode {
  id: number;
  name: string;
  type: NodeType;
  latitude: number;
  longitude: number;
}

export interface Route {
  path: number[];
  path_nodes: RouteNode[];
  total_weight: number;
  computed_at: string;
}

export interface Order {
  id: number;
  status: OrderStatus;
  status_display: string;
  customer: Customer;
  courier: Courier | null;
  store: number;
  delivery_address: number;
  total_price: string;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  route: Route | null;
}

export interface OrderListItem {
  id: number;
  status: OrderStatus;
  status_display: string;
  customer_name: string;
  courier: Courier | null;
  store: number;
  delivery_address: number | null;
  total_price: string;
  created_at: string;
}

// Cart
export interface CartItemProduct {
  id: number;
  name: string;
  description: string;
  price: string;
  stock_qty: number;
  store: number;
}

export interface CartItem {
  id: number;
  product: CartItemProduct;
  quantity: number;
  price_at_order: string;
}

export interface Cart {
  id: number | null;
  store: number | null;
  total_price: string;
  items: CartItem[];
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface TokenPair {
  access: string;
  refresh: string;
}