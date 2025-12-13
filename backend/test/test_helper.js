
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.MAX_LOGIN_ATTEMPTS = '5';
process.env.LOCKOUT_TIME = '15';
process.env.PASSWORD_RESET_EXPIRES_IN = '60';
process.env.BCRYPT_ROUNDS = '4'; 

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const request = require('supertest');




const testCredentials = {
  admin: { email: 'admin@feastfrenzy.com', password: 'Admin123!' },
  manager: { email: 'manager@feastfrenzy.com', password: 'Manager123!' },
  employee: { email: 'employee@feastfrenzy.com', password: 'Employee123!' },
};


const generateTestToken = (role = 'admin', overrides = {}) => {
  const userIds = { admin: 1, manager: 2, employee: 3 };
  const payload = {
    id: userIds[role] || 1,
    email: testCredentials[role]?.email || 'test@example.com',
    role: role,
    ...overrides,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
};


const createTestUsers = async (db) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 4;
  
  const users = [
    {
      id: 1,
      email: 'admin@feastfrenzy.com',
      password: await bcrypt.hash('Admin123!', rounds),
      name: 'Admin User',
      role: 'admin',
      isActive: true,
    },
    {
      id: 2,
      email: 'manager@feastfrenzy.com',
      password: await bcrypt.hash('Manager123!', rounds),
      name: 'Manager User',
      role: 'manager',
      isActive: true,
    },
    {
      id: 3,
      email: 'employee@feastfrenzy.com',
      password: await bcrypt.hash('Employee123!', rounds),
      name: 'Employee User',
      role: 'employee',
      isActive: true,
    },
  ];

  for (const user of users) {
    await db.users.findOrCreate({
      where: { email: user.email },
      defaults: user,
    });
  }

  return users;
};


const generateExpiredToken = (role = 'admin') => {
  const userIds = { admin: 1, manager: 2, employee: 3 };
  const payload = {
    id: userIds[role],
    email: testCredentials[role]?.email,
    role: role,
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '-1h', 
  });
};


const generateInvalidToken = () => {
  return 'invalid.token.here';
};

module.exports = {
  testCredentials,
  generateTestToken,
  createTestUsers,
  generateExpiredToken,
  generateInvalidToken,
};
