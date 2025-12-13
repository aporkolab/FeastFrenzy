import { User, UserRole, LoginRequest, RegisterRequest, AuthResponse, TokenResponse } from './auth';

describe('Auth Models', () => {
  describe('User', () => {
    it('should create a valid User object', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'employee'
      };

      expect(user.id).toBe(1);
      expect(user.email).toBe('test@example.com');
      expect(user.name).toBe('Test User');
      expect(user.role).toBe('employee');
    });

    it('should support all UserRole values', () => {
      const roles: UserRole[] = ['admin', 'manager', 'employee'];
      
      roles.forEach(role => {
        const user: User = {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: role
        };
        expect(user.role).toBe(role);
      });
    });

    it('should support optional fields', () => {
      const user: User = {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
        lastLogin: '2024-01-15T10:30:00Z',
        createdAt: '2024-01-01T00:00:00Z'
      };

      expect(user.lastLogin).toBe('2024-01-15T10:30:00Z');
      expect(user.createdAt).toBe('2024-01-01T00:00:00Z');
    });
  });

  describe('LoginRequest', () => {
    it('should create a valid LoginRequest object', () => {
      const request: LoginRequest = {
        email: 'test@example.com',
        password: 'password123'
      };

      expect(request.email).toBe('test@example.com');
      expect(request.password).toBe('password123');
    });
  });

  describe('RegisterRequest', () => {
    it('should create a valid RegisterRequest object', () => {
      const request: RegisterRequest = {
        name: 'New User',
        email: 'new@example.com',
        password: 'StrongPassword123'
      };

      expect(request.name).toBe('New User');
      expect(request.email).toBe('new@example.com');
      expect(request.password).toBe('StrongPassword123');
    });
  });

  describe('TokenResponse', () => {
    it('should create a valid TokenResponse object', () => {
      const tokens: TokenResponse = {
        accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        refreshToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
      };

      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });
  });

  describe('AuthResponse', () => {
    it('should create a valid AuthResponse object', () => {
      const response: AuthResponse = {
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
          role: 'employee'
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };

      expect(response.user.id).toBe(1);
      expect(response.tokens.accessToken).toBe('access-token');
    });
  });
});
