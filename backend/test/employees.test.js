const request = require('supertest');

const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Employees API', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });

    await createTestUsers(db);

    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    employeeToken = generateTestToken('employee');
  });

  beforeEach(async () => {
    // Delete in correct order due to foreign key constraints
    await db.purchaseItems.destroy({ where: {} });
    await db.purchases.destroy({ where: {} });
    await db.employees.destroy({ where: {} });
  });

  describe(`GET ${API_BASE}/employees`, () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get(`${API_BASE}/employees`).expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when employee tries to list all employees', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return empty array for manager when no employees exist', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(0);
    });

    it('should return all employees for admin', async () => {
      await db.employees.bulkCreate([
        {
          name: 'John Doe',
          employee_number: 'EMP001',
          monthlyConsumptionValue: 1000,
        },
        {
          name: 'Jane Smith',
          employee_number: 'EMP002',
          monthlyConsumptionValue: 2000,
        },
        {
          name: 'Bob Wilson',
          employee_number: 'EMP003',
          monthlyConsumptionValue: 1500,
        },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('employee_number');
      expect(res.body.data[0]).toHaveProperty('monthlyConsumptionValue');
    });

    it('should return all employees for manager', async () => {
      const ts = Date.now();
      await db.employees.bulkCreate([
        {
          name: 'John Doe',
          employee_number: `EMP${ts}A`,
          monthlyConsumptionValue: 1000,
        },
        {
          name: 'Jane Smith',
          employee_number: `EMP${ts}B`,
          monthlyConsumptionValue: 2000,
        },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe(`GET ${API_BASE}/employees/:id`, () => {
    it('should return 403 when employee tries to view another employee', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: 'EMP100',
        monthlyConsumptionValue: 500,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should return a single employee by ID for admin', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: `EMP${Date.now()}`,
        monthlyConsumptionValue: 500,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', employee.id);
      expect(res.body).toHaveProperty('name', 'Test Employee');
      expect(res.body).toHaveProperty('employee_number');
      expect(res.body.monthlyConsumptionValue).toBe(500);
    });

    it('should return a single employee by ID for manager', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: `MGR${Date.now()}`,
        monthlyConsumptionValue: 500,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', employee.id);
    });

    it('should return 404 for non-existent employee', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });
  });

  describe(`POST ${API_BASE}/employees`, () => {
    it('should return 403 when employee tries to create', async () => {
      const newEmployee = {
        name: 'New Employee',
        employee_number: 'EMP200',
        monthlyConsumptionValue: 1000,
      };

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newEmployee)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when manager tries to create', async () => {
      const newEmployee = {
        name: 'New Employee',
        employee_number: 'EMP200',
        monthlyConsumptionValue: 1000,
      };

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newEmployee)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should create a new employee with admin token', async () => {
      const newEmployee = {
        name: 'New Employee',
        employee_number: 'EMP200',
        monthlyConsumptionValue: 1000,
      };

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newEmployee)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'New Employee');
      expect(res.body).toHaveProperty('employee_number', 'EMP200');
      expect(res.body.monthlyConsumptionValue).toBe(1000);

      const dbEmployee = await db.employees.findByPk(res.body.id);
      expect(dbEmployee).not.toBeNull();
    });

    it('should return 400 for missing required name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ employee_number: 'EMP999', monthlyConsumptionValue: 1000 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should return 409 for duplicate employee_number', async () => {
      const uniqueEmpNum = `DUP${Date.now()}`;
      await db.employees.create({
        name: 'First Employee',
        employee_number: uniqueEmpNum,
        monthlyConsumptionValue: 1000,
      });

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Second Employee',
          employee_number: uniqueEmpNum,
          monthlyConsumptionValue: 2000,
        })
        .expect(409);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe(`PUT ${API_BASE}/employees/:id`, () => {
    it('should return 403 when employee tries to update', async () => {
      const employee = await db.employees.create({
        name: 'Original Name',
        employee_number: 'EMP300',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Name', monthlyConsumptionValue: 200 })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when manager tries to update', async () => {
      const employee = await db.employees.create({
        name: 'Original Name',
        employee_number: `UPD${Date.now()}A`,
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Name', monthlyConsumptionValue: 200 })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should update an existing employee with admin token', async () => {
      const employee = await db.employees.create({
        name: 'Original Name',
        employee_number: `UPD${Date.now()}B`,
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name', monthlyConsumptionValue: 200 })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Updated Name');
      expect(res.body.monthlyConsumptionValue).toBe(200);
    });

    it('should return 404 when updating non-existent employee', async () => {
      const res = await request(app)
        .put(`${API_BASE}/employees/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost', monthlyConsumptionValue: 0 })
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should allow partial updates', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: 'EMP400',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ monthlyConsumptionValue: 500 })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Test Employee');
      expect(res.body.monthlyConsumptionValue).toBe(500);
    });
  });

  describe(`DELETE ${API_BASE}/employees/:id`, () => {
    it('should return 403 when employee tries to delete', async () => {
      const employee = await db.employees.create({
        name: 'To Delete',
        employee_number: 'EMP500',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .delete(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when manager tries to delete', async () => {
      const employee = await db.employees.create({
        name: 'To Delete',
        employee_number: `DEL${Date.now()}A`,
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .delete(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should delete an existing employee with admin token', async () => {
      const employee = await db.employees.create({
        name: 'To Delete',
        employee_number: `DEL${Date.now()}B`,
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .delete(`${API_BASE}/employees/${employee.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deleted', true);

      const deleted = await db.employees.findByPk(employee.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting non-existent employee', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/employees/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });
  });

  describe('Business Logic', () => {
    it('should handle zero consumption value', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Zero Consumption',
          employee_number: 'EMP600',
          monthlyConsumptionValue: 0,
        })
        .expect(201);

      expect(res.body.monthlyConsumptionValue).toBe(0);
    });

    it('should handle large consumption values', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Big Spender',
          employee_number: 'EMP700',
          monthlyConsumptionValue: 999999,
        })
        .expect(201);

      expect(res.body.monthlyConsumptionValue).toBe(999999);
    });
  });
});
