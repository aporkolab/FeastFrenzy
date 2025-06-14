/**
 * Type definitions for Cypress E2E tests
 * These types mirror the backend models for type-safe testing
 */

export interface Product {
  id?: number;
  name: string;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Employee {
  id?: number;
  name: string;
  employee_number: string;
  monthlyConsumptionValue: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Purchase {
  id?: number;
  date: string;
  employeeId: number;
  closed: boolean;
  total?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id?: number;
  purchaseId: number;
  productId: number;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'employee';
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
  timestamp: string;
}
