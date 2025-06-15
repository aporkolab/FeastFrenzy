const request = require('supertest');

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const app = require('../server');
const db = require('../model');

describe('Auth API', () => {
  const API_BASE = '/api/v1/auth';

  const validUser = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123',
  };

  const adminUser = {
    name: 'Admin User',
    email: 'admin@test.com',
    password: 'Admin123!',
  };

  beforeAll(async () => {
    await db.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await db.users.destroy({ where: {}, truncate: true });
  });

  describe(`POST ${API_BASE}/register`, () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('name', validUser.name);
      expect(res.body.user).toHaveProperty(
        'email',
        validUser.email.toLowerCase(),
      );
      expect(res.body.user).toHaveProperty('role', 'employee');
      expect(res.body.user).not.toHaveProperty('password');
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');

      const dbUser = await db.users.findByEmail(validUser.email);
      expect(dbUser).not.toBeNull();
      expect(dbUser.password).not.toBe(validUser.password);
    });

    it('should return 409 for duplicate email', async () => {
      await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(201);

      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(409);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'CONFLICT');
    });

    it('should return 400 for weak password (missing uppercase)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({
          name: 'Weak Pass User',
          email: 'weak@test.com',
          password: 'password123',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('uppercase');
    });

    it('should return 400 for weak password (missing number)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({
          name: 'Weak Pass User',
          email: 'weak@test.com',
          password: 'PasswordOnly',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 400 for short password', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({
          name: 'Short Pass User',
          email: 'short@test.com',
          password: 'Pass1',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('8');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({
          name: 'Bad Email User',
          email: 'not-an-email',
          password: 'Password123',
        })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('email');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({ email: 'test@test.com' })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe(`POST ${API_BASE}/login`, () => {
    beforeEach(async () => {
      await request(app).post(`${API_BASE}/register`).send(validUser);
    });

    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: validUser.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tokens');
      expect(res.body.user).toHaveProperty(
        'email',
        validUser.email.toLowerCase(),
      );
      expect(res.body.tokens).toHaveProperty('accessToken');
      expect(res.body.tokens).toHaveProperty('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        })
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toBe('Invalid credentials');
    });

    it('should lock account after 5 failed login attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post(`${API_BASE}/login`).send({
          email: validUser.email,
          password: 'WrongPassword123',
        });
      }

      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: 'WrongPassword123',
        })
        .expect(423);

      expect(res.body.error.message).toContain('locked');
    });

    it('should update lastLogin timestamp on successful login', async () => {
      await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: validUser.password,
        })
        .expect(200);

      const user = await db.users.findByEmail(validUser.email);
      expect(user.lastLogin).not.toBeNull();
    });
  });

  describe(`POST ${API_BASE}/refresh`, () => {
    let tokens;

    beforeEach(async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser);
      tokens = res.body.tokens;
    });

    it('should refresh tokens successfully', async () => {
      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');

      expect(res.body.refreshToken).not.toBe(tokens.refreshToken);
    });

    it('should invalidate old refresh token after rotation', async () => {
      await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(200);

      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);

      expect(res.body.error.message).toBe('Invalid refresh token');
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 401 for expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'employee' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1h' },
      );

      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(res.body.error.message).toContain('Invalid');
    });
  });

  describe(`POST ${API_BASE}/logout`, () => {
    let tokens;

    beforeEach(async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser);
      tokens = res.body.tokens;
    });

    it('should logout successfully and invalidate refresh token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/logout`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Logged out successfully');

      const user = await db.users.findByEmail(validUser.email);
      expect(user.refreshToken).toBeNull();

      const refreshRes = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app).post(`${API_BASE}/logout`).expect(401);

      expect(res.body.error.message).toContain('token');
    });
  });

  describe(`GET ${API_BASE}/me`, () => {
    let tokens;

    beforeEach(async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser);
      tokens = res.body.tokens;
    });

    it('should return current user info with valid token', async () => {
      const res = await request(app)
        .get(`${API_BASE}/me`)
        .set('Authorization', `Bearer ${tokens.accessToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('user');
      expect(res.body.user).toHaveProperty(
        'email',
        validUser.email.toLowerCase(),
      );
      expect(res.body.user).toHaveProperty('name', validUser.name);
      expect(res.body.user).not.toHaveProperty('password');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`${API_BASE}/me`).expect(401);

      expect(res.body.error.message).toContain('token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'employee' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' },
      );

      const res = await request(app)
        .get(`${API_BASE}/me`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.error.message).toContain('expired');
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get(`${API_BASE}/me`)
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .expect(401);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe(`POST ${API_BASE}/forgot-password`, () => {
    beforeEach(async () => {
      await request(app).post(`${API_BASE}/register`).send(validUser);
    });

    it('should return success message for existing email', async () => {
      const res = await request(app)
        .post(`${API_BASE}/forgot-password`)
        .send({ email: validUser.email })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'If email exists, reset link sent',
      );

      const user = await db.users.findByEmail(validUser.email);
      expect(user.passwordResetToken).not.toBeNull();
      expect(user.passwordResetExpires).not.toBeNull();
    });

    it('should return same success message for non-existent email (security)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/forgot-password`)
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(res.body).toHaveProperty(
        'message',
        'If email exists, reset link sent',
      );
    });
  });

  describe(`POST ${API_BASE}/reset-password`, () => {
    let resetToken;

    beforeEach(async () => {
      await request(app).post(`${API_BASE}/register`).send(validUser);

      resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

      await db.users.update(
        {
          passwordResetToken: hashedToken,
          passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
        },
        { where: { email: validUser.email.toLowerCase() } },
      );
    });

    it('should reset password successfully with valid token', async () => {
      const newPassword = 'NewPassword123';

      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: resetToken,
          newPassword,
        })
        .expect(200);

      expect(res.body).toHaveProperty('message', 'Password reset successful');

      const loginRes = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginRes.body).toHaveProperty('tokens');
    });

    it('should return 400 for invalid reset token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid');
    });

    it('should return 400 for expired reset token', async () => {
      const expiredHashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      await db.users.update(
        {
          passwordResetExpires: new Date(Date.now() - 60 * 60 * 1000),
        },
        { where: { passwordResetToken: expiredHashedToken } },
      );

      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: resetToken,
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(res.body.error.message).toContain('expired');
    });

    it('should invalidate reset token after use', async () => {
      await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: resetToken,
          newPassword: 'NewPassword123',
        })
        .expect(200);

      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: resetToken,
          newPassword: 'AnotherPassword123',
        })
        .expect(400);

      expect(res.body.error.message).toContain('Invalid');
    });
  });

  describe('Security & Edge Cases', () => {
    it('should not expose password in any response', async () => {
      const registerRes = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(201);

      expect(JSON.stringify(registerRes.body)).not.toContain(
        validUser.password,
      );

      const loginRes = await request(app)
        .post(`${API_BASE}/login`)
        .send({ email: validUser.email, password: validUser.password })
        .expect(200);

      expect(JSON.stringify(loginRes.body)).not.toContain(validUser.password);
    });

    it('should handle case-insensitive email login', async () => {
      await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(201);

      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email.toUpperCase(),
          password: validUser.password,
        })
        .expect(200);

      expect(res.body).toHaveProperty('tokens');
    });

    it('should reject request without Content-Type', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .set('Content-Type', '')
        .send('email=test@test.com&password=test');

      expect([400, 401, 415]).toContain(res.status);
    });
  });
});
