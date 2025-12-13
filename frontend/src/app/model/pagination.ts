


export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}


export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}


export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
}


export interface ProductQueryParams extends PaginationParams {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
}


export interface EmployeeQueryParams extends PaginationParams {
  name?: string;
  employee_number?: string;
  minConsumption?: number;
  maxConsumption?: number;
}


export interface PurchaseQueryParams extends PaginationParams {
  employeeId?: number;
  closed?: boolean;
  dateFrom?: string;
  dateTo?: string;
  minTotal?: number;
  maxTotal?: number;
}


export interface PaginationState {
  currentPage: number;
  itemsPerPage: number;
  totalItems: number;
  totalPages: number;
  sortField: string;
  sortDirection: 'asc' | 'desc';
}


export const DEFAULT_PAGINATION: PaginationState = {
  currentPage: 1,
  itemsPerPage: 20,
  totalItems: 0,
  totalPages: 0,
  sortField: 'id',
  sortDirection: 'asc',
};


export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];
