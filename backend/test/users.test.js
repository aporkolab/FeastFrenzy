const request = require('supertest');

const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Users API', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;
  let testUsers;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });

    testUsers = await createTestUsers(db);

    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    employeeToken = generateTestToken('employee');
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users/me`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('email');
      expect(res.body).toHaveProperty('role', 'admin');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`${API_BASE}/users/me`)
        .expect(401);
    });

    it('should work for all roles', async () => {
      const resManager = await request(app)
        .get(`${API_BASE}/users/me`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(resManager.body).toHaveProperty('role', 'manager');

      const resEmployee = await request(app)
        .get(`${API_BASE}/users/me`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(resEmployee.body).toHaveProperty('role', 'employee');
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return 401 without authentication', async () => {
      await request(app)
        .get(`${API_BASE}/users`)
        .expect(401);
    });

    it('should return 403 when employee tries to list users', async () => {
      await request(app)
        .get(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return 403 when manager tries to list users', async () => {
      await request(app)
        .get(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should return all users for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      // Should not expose passwords
      res.body.data.forEach(user => {
        expect(user).not.toHaveProperty('password');
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users?page=1&limit=2`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('meta');
      expect(res.body.meta).toHaveProperty('page', 1);
      expect(res.body.meta).toHaveProperty('limit', 2);
    });

    it('should filter by role', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users?role=admin`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.data.forEach(user => {
        expect(user.role).toBe('admin');
      });
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return 403 when employee tries to view user', async () => {
      await request(app)
        .get(`${API_BASE}/users/1`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return a single user by ID for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users/1`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('email');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get(`${API_BASE}/users/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/users', () => {
    it('should return 403 when employee tries to create user', async () => {
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'Password123!',
          name: 'New User',
        })
        .expect(403);
    });

    it('should return 403 when manager tries to create user', async () => {
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({
          email: 'newuser@test.com',
          password: 'Password123!',
          name: 'New User',
        })
        .expect(403);
    });

    it('should create a new user with admin token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'created@test.com',
          password: 'Password123!',
          name: 'Created User',
          role: 'employee',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('email', 'created@test.com');
      expect(res.body).toHaveProperty('role', 'employee');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should return 400 for missing required fields', async () => {
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'missing@test.com',
          // missing password and name
        })
        .expect(400);
    });

    it('should return 400 for invalid email', async () => {
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 for short password', async () => {
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'shortpass@test.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 409 for duplicate email', async () => {
      // First create a user
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          password: 'Password123!',
          name: 'First User',
        })
        .expect(201);

      // Try to create another with same email
      await request(app)
        .post(`${API_BASE}/users`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'duplicate@test.com',
          password: 'Password123!',
          name: 'Second User',
        })
        .expect(409);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    let userToUpdate;

    beforeEach(async () => {
      userToUpdate = await db.users.create({
        email: `update-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'User To Update',
        role: 'employee',
      });
    });

    it('should return 403 when employee tries to update', async () => {
      await request(app)
        .put(`${API_BASE}/users/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Name' })
        .expect(403);
    });

    it('should update user with admin token', async () => {
      const res = await request(app)
        .put(`${API_BASE}/users/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Updated Name');
    });

    it('should return 404 when updating non-existent user', async () => {
      await request(app)
        .put(`${API_BASE}/users/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' })
        .expect(404);
    });

    it('should update role', async () => {
      const res = await request(app)
        .put(`${API_BASE}/users/${userToUpdate.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'manager' })
        .expect(200);

      expect(res.body).toHaveProperty('role', 'manager');
    });
  });

  describe('PATCH /api/v1/users/:id', () => {
    let userToPatch;

    beforeEach(async () => {
      userToPatch = await db.users.create({
        email: `patch-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'User To Patch',
        role: 'employee',
      });
    });

    it('should allow partial updates', async () => {
      const res = await request(app)
        .patch(`${API_BASE}/users/${userToPatch.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Partially Updated' })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Partially Updated');
      expect(res.body).toHaveProperty('role', 'employee'); // unchanged
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    let userToDelete;

    beforeEach(async () => {
      userToDelete = await db.users.create({
        email: `delete-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'User To Delete',
        role: 'employee',
      });
    });

    it('should return 403 when employee tries to delete', async () => {
      await request(app)
        .delete(`${API_BASE}/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return 403 when manager tries to delete', async () => {
      await request(app)
        .delete(`${API_BASE}/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);
    });

    it('should delete user with admin token', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/users/${userToDelete.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deleted', true);

      // Verify deletion
      const deleted = await db.users.findByPk(userToDelete.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting non-existent user', async () => {
      await request(app)
        .delete(`${API_BASE}/users/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('POST /api/v1/users/:id/deactivate', () => {
    let userToDeactivate;

    beforeEach(async () => {
      userToDeactivate = await db.users.create({
        email: `deactivate-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'User To Deactivate',
        role: 'employee',
        isActive: true,
      });
    });

    it('should return 403 when non-admin tries to deactivate', async () => {
      await request(app)
        .post(`${API_BASE}/users/${userToDeactivate.id}/deactivate`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should deactivate user with admin token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/users/${userToDeactivate.id}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('message', 'User deactivated successfully');

      // Verify deactivation
      const user = await db.users.findByPk(userToDeactivate.id);
      expect(user.isActive).toBe(false);
    });
  });

  describe('POST /api/v1/users/:id/reactivate', () => {
    let userToReactivate;

    beforeEach(async () => {
      userToReactivate = await db.users.create({
        email: `reactivate-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'User To Reactivate',
        role: 'employee',
        isActive: false,
      });
    });

    it('should return 403 when non-admin tries to reactivate', async () => {
      await request(app)
        .post(`${API_BASE}/users/${userToReactivate.id}/reactivate`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should reactivate user with admin token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/users/${userToReactivate.id}/reactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('isActive', true);

      // Verify reactivation
      const user = await db.users.findByPk(userToReactivate.id);
      expect(user.isActive).toBe(true);
    });
  });

  describe('POST /api/v1/users/:id/unlock', () => {
    let lockedUser;

    beforeEach(async () => {
      lockedUser = await db.users.create({
        email: `locked-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Locked User',
        role: 'employee',
        failedLoginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 3600000), // locked for 1 hour
      });
    });

    it('should return 403 when non-admin tries to unlock', async () => {
      await request(app)
        .post(`${API_BASE}/users/${lockedUser.id}/unlock`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should unlock user with admin token', async () => {
      const res = await request(app)
        .post(`${API_BASE}/users/${lockedUser.id}/unlock`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('failedLoginAttempts', 0);
      expect(res.body.lockoutUntil).toBeNull();
    });
  });

  describe('GET /api/v1/users/locked', () => {
    beforeEach(async () => {
      // Create a locked user
      await db.users.create({
        email: `getlocked-${Date.now()}@test.com`,
        password: 'Password123!',
        name: 'Get Locked User',
        role: 'employee',
        failedLoginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 3600000),
      });
    });

    it('should return 403 when non-admin tries to get locked users', async () => {
      await request(app)
        .get(`${API_BASE}/users/locked`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return locked users for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users/locked`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeInstanceOf(Array);
      res.body.forEach(user => {
        expect(user.failedLoginAttempts).toBeGreaterThanOrEqual(5);
      });
    });
  });

  describe('GET /api/v1/users/stats/by-role', () => {
    it('should return 403 when non-admin tries to get stats', async () => {
      await request(app)
        .get(`${API_BASE}/users/stats/by-role`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return user counts by role for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users/stats/by-role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('admin');
      expect(res.body).toHaveProperty('manager');
      expect(res.body).toHaveProperty('employee');
      expect(typeof res.body.admin).toBe('number');
    });
  });

  describe('GET /api/v1/users/:id/stats', () => {
    it('should return 403 when non-admin tries to get user stats', async () => {
      await request(app)
        .get(`${API_BASE}/users/1/stats`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);
    });

    it('should return user with stats for admin', async () => {
      const res = await request(app)
        .get(`${API_BASE}/users/1/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', 1);
      expect(res.body).toHaveProperty('stats');
    });

    it('should return 404 for non-existent user', async () => {
      await request(app)
        .get(`${API_BASE}/users/99999/stats`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });
});
