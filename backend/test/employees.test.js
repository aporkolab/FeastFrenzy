const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../model');

describe('Employees API', () => {
  const API_BASE = '/api/v1';

  before(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    await db.employees.destroy({ where: {}, truncate: true });
  });

  

  describe(`GET ${API_BASE}/employees`, () => {
    it('should return empty array when no employees exist', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(0);
    });

    it('should return all employees', async () => {
      await db.employees.bulkCreate([
        { name: 'John Doe', employee_number: 'EMP001', monthlyConsumptionValue: 1000 },
        { name: 'Jane Smith', employee_number: 'EMP002', monthlyConsumptionValue: 2000 },
        { name: 'Bob Wilson', employee_number: 'EMP003', monthlyConsumptionValue: 1500 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/employees`)
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(3);
      expect(res.body[0]).to.have.property('name');
      expect(res.body[0]).to.have.property('employee_number');
      expect(res.body[0]).to.have.property('monthlyConsumptionValue');
    });
  });

  describe(`GET ${API_BASE}/employees/:id`, () => {
    it('should return a single employee by ID', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: 'EMP100',
        monthlyConsumptionValue: 500,
      });

      const res = await request(app)
        .get(`${API_BASE}/employees/${employee.id}`)
        .expect(200);

      expect(res.body).to.have.property('id', employee.id);
      expect(res.body).to.have.property('name', 'Test Employee');
      expect(res.body).to.have.property('employee_number', 'EMP100');
      expect(res.body.monthlyConsumptionValue).to.equal(500);
    });

    it('should return 404 for non-existent employee', async () => {
      const res = await request(app)
        .get(`${API_BASE}/employees/99999`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'NOT_FOUND');
    });
  });

  describe(`POST ${API_BASE}/employees`, () => {
    it('should create a new employee with valid data', async () => {
      const newEmployee = {
        name: 'New Employee',
        employee_number: 'EMP200',
        monthlyConsumptionValue: 1000,
      };

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send(newEmployee)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'New Employee');
      expect(res.body).to.have.property('employee_number', 'EMP200');
      expect(res.body.monthlyConsumptionValue).to.equal(1000);

      
      const dbEmployee = await db.employees.findByPk(res.body.id);
      expect(dbEmployee).to.not.be.null;
    });

    it('should return 400 for missing required name', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({ employee_number: 'EMP999', monthlyConsumptionValue: 1000 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
    });

    it('should return 409 for duplicate employee_number', async () => {
      await db.employees.create({
        name: 'First Employee',
        employee_number: 'EMP001',
        monthlyConsumptionValue: 1000,
      });

      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({
          name: 'Second Employee',
          employee_number: 'EMP001', 
          monthlyConsumptionValue: 2000,
        })
        .expect(409);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.code).to.equal('CONFLICT');
    });
  });

  describe(`PUT ${API_BASE}/employees/:id`, () => {
    it('should update an existing employee', async () => {
      const employee = await db.employees.create({
        name: 'Original Name',
        employee_number: 'EMP300',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .send({ name: 'Updated Name', monthlyConsumptionValue: 200 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Updated Name');
      expect(res.body.monthlyConsumptionValue).to.equal(200);
    });

    it('should return 404 when updating non-existent employee', async () => {
      const res = await request(app)
        .put(`${API_BASE}/employees/99999`)
        .send({ name: 'Ghost', monthlyConsumptionValue: 0 })
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });

    it('should allow partial updates', async () => {
      const employee = await db.employees.create({
        name: 'Test Employee',
        employee_number: 'EMP400',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .put(`${API_BASE}/employees/${employee.id}`)
        .send({ monthlyConsumptionValue: 500 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Test Employee');
      expect(res.body.monthlyConsumptionValue).to.equal(500);
    });
  });

  describe(`DELETE ${API_BASE}/employees/:id`, () => {
    it('should delete an existing employee', async () => {
      const employee = await db.employees.create({
        name: 'To Delete',
        employee_number: 'EMP500',
        monthlyConsumptionValue: 100,
      });

      const res = await request(app)
        .delete(`${API_BASE}/employees/${employee.id}`)
        .expect(200);

      expect(res.body).to.have.property('deleted', true);

      const deleted = await db.employees.findByPk(employee.id);
      expect(deleted).to.be.null;
    });

    it('should return 404 when deleting non-existent employee', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/employees/99999`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });
  });

  describe('Business Logic', () => {
    it('should handle zero consumption value', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({
          name: 'Zero Consumption',
          employee_number: 'EMP600',
          monthlyConsumptionValue: 0,
        })
        .expect(201);

      expect(res.body.monthlyConsumptionValue).to.equal(0);
    });

    it('should handle large consumption values', async () => {
      const res = await request(app)
        .post(`${API_BASE}/employees`)
        .send({
          name: 'Big Spender',
          employee_number: 'EMP700',
          monthlyConsumptionValue: 999999,
        })
        .expect(201);

      expect(res.body.monthlyConsumptionValue).to.equal(999999);
    });
  });
});
