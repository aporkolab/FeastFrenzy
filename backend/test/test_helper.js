
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.LOCKOUT_TIME = '15';
process.env.PASSWORD_RESET_EXPIRES_IN = '60';
process.env.BCRYPT_ROUNDS = '4'; 
