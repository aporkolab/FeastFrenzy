const request = require('supertest');
const { expect } = require('chai');
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

  before(async () => {
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

      expect(res.body).to.have.property('user');
      expect(res.body).to.have.property('tokens');
      expect(res.body.user).to.have.property('id');
      expect(res.body.user).to.have.property('name', validUser.name);
      expect(res.body.user).to.have.property(
        'email',
        validUser.email.toLowerCase()
      );
      expect(res.body.user).to.have.property('role', 'employee');
      expect(res.body.user).to.not.have.property('password');
      expect(res.body.tokens).to.have.property('accessToken');
      expect(res.body.tokens).to.have.property('refreshToken');

      const dbUser = await db.users.findByEmail(validUser.email);
      expect(dbUser).to.not.be.null;
      expect(dbUser.password).to.not.equal(validUser.password);
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

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'CONFLICT');
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

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('uppercase');
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

      expect(res.body).to.have.property('success', false);
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

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('8');
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

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('email');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/register`)
        .send({ email: 'test@test.com' })
        .expect(400);

      expect(res.body).to.have.property('success', false);
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

      expect(res.body).to.have.property('user');
      expect(res.body).to.have.property('tokens');
      expect(res.body.user).to.have.property(
        'email',
        validUser.email.toLowerCase()
      );
      expect(res.body.tokens).to.have.property('accessToken');
      expect(res.body.tokens).to.have.property('refreshToken');
    });

    it('should return 401 for wrong password', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: 'WrongPassword123',
        })
        .expect(401);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.equal('Invalid credentials');
    });

    it('should return 401 for non-existent email', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: 'nonexistent@test.com',
          password: 'Password123',
        })
        .expect(401);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.equal('Invalid credentials');
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

      expect(res.body.error.message).to.include('locked');
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
      expect(user.lastLogin).to.not.be.null;
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

      expect(res.body).to.have.property('accessToken');
      expect(res.body).to.have.property('refreshToken');

      expect(res.body.refreshToken).to.not.equal(tokens.refreshToken);
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

      expect(res.body.error.message).to.equal('Invalid refresh token');
    });

    it('should return 401 for invalid refresh token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(res.body).to.have.property('success', false);
    });

    it('should return 401 for expired refresh token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'employee' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: expiredToken })
        .expect(401);

      expect(res.body.error.message).to.include('Invalid');
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

      expect(res.body).to.have.property('message', 'Logged out successfully');

      const user = await db.users.findByEmail(validUser.email);
      expect(user.refreshToken).to.be.null;

      const refreshRes = await request(app)
        .post(`${API_BASE}/refresh`)
        .send({ refreshToken: tokens.refreshToken })
        .expect(401);
    });

    it('should return 401 without authorization header', async () => {
      const res = await request(app).post(`${API_BASE}/logout`).expect(401);

      expect(res.body.error.message).to.include('token');
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

      expect(res.body).to.have.property('user');
      expect(res.body.user).to.have.property(
        'email',
        validUser.email.toLowerCase()
      );
      expect(res.body.user).to.have.property('name', validUser.name);
      expect(res.body.user).to.not.have.property('password');
    });

    it('should return 401 without token', async () => {
      const res = await request(app).get(`${API_BASE}/me`).expect(401);

      expect(res.body.error.message).to.include('token');
    });

    it('should return 401 with expired token', async () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'employee' },
        process.env.JWT_SECRET,
        { expiresIn: '-1h' }
      );

      const res = await request(app)
        .get(`${API_BASE}/me`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(res.body.error.message).to.include('expired');
    });

    it('should return 401 with malformed token', async () => {
      const res = await request(app)
        .get(`${API_BASE}/me`)
        .set('Authorization', 'Bearer not-a-valid-jwt')
        .expect(401);

      expect(res.body).to.have.property('success', false);
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

      expect(res.body).to.have.property(
        'message',
        'If email exists, reset link sent'
      );

      const user = await db.users.findByEmail(validUser.email);
      expect(user.passwordResetToken).to.not.be.null;
      expect(user.passwordResetExpires).to.not.be.null;
    });

    it('should return same success message for non-existent email (security)', async () => {
      const res = await request(app)
        .post(`${API_BASE}/forgot-password`)
        .send({ email: 'nonexistent@test.com' })
        .expect(200);

      expect(res.body).to.have.property(
        'message',
        'If email exists, reset link sent'
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
        { where: { email: validUser.email.toLowerCase() } }
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

      expect(res.body).to.have.property('message', 'Password reset successful');

      const loginRes = await request(app)
        .post(`${API_BASE}/login`)
        .send({
          email: validUser.email,
          password: newPassword,
        })
        .expect(200);

      expect(loginRes.body).to.have.property('tokens');
    });

    it('should return 400 for invalid reset token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: 'invalid-token',
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(res.body.error.message).to.include('Invalid');
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
        { where: { passwordResetToken: expiredHashedToken } }
      );

      const res = await request(app)
        .post(`${API_BASE}/reset-password`)
        .send({
          token: resetToken,
          newPassword: 'NewPassword123',
        })
        .expect(400);

      expect(res.body.error.message).to.include('expired');
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

      expect(res.body.error.message).to.include('Invalid');
    });
  });

  describe('Security & Edge Cases', () => {
    it('should not expose password in any response', async () => {
      const registerRes = await request(app)
        .post(`${API_BASE}/register`)
        .send(validUser)
        .expect(201);

      expect(JSON.stringify(registerRes.body)).to.not.include(
        validUser.password
      );

      const loginRes = await request(app)
        .post(`${API_BASE}/login`)
        .send({ email: validUser.email, password: validUser.password })
        .expect(200);

      expect(JSON.stringify(loginRes.body)).to.not.include(validUser.password);
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

      expect(res.body).to.have.property('tokens');
    });

    it('should reject request without Content-Type', async () => {
      const res = await request(app)
        .post(`${API_BASE}/login`)
        .set('Content-Type', '')
        .send('email=test@test.com&password=test');

      expect(res.status).to.be.oneOf([400, 401, 415]);
    });
  });
});
