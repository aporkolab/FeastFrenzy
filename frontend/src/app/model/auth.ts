
export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
  lastLogin?: string;
  createdAt?: string;
}


export type UserRole = 'admin' | 'manager' | 'employee';


export interface LoginRequest {
  email: string;
  password: string;
}


export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}


export interface AuthResponse {
  user: User;
  tokens: TokenResponse;
}


export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
}
