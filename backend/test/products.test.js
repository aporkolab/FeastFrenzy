const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Products API', () => {
  const API_BASE = '/api/v1';
  let adminToken, managerToken, employeeToken;
  
  before(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });
    
    
    await createTestUsers(db);
    
    
    adminToken = generateTestToken('admin');
    managerToken = generateTestToken('manager');
    employeeToken = generateTestToken('employee');
  });

  beforeEach(async () => {
    await db.products.destroy({ where: {}, truncate: true });
  });

  describe(`GET ${API_BASE}/products`, () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products`)
        .expect(401);

      expect(res.body).to.have.property('error');
    });

    it('should return empty array when no products exist', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('meta');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data).to.have.lengthOf(0);
      expect(res.body.meta.total).to.equal(0);
    });

    it('should return all products for authenticated user with pagination meta', async () => {
      await db.products.bulkCreate([
        { name: 'Product A', price: 10.00 },
        { name: 'Product B', price: 20.00 },
        { name: 'Product C', price: 30.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).to.have.property('data');
      expect(res.body).to.have.property('meta');
      expect(res.body.data).to.be.an('array');
      expect(res.body.data).to.have.lengthOf(3);
      expect(res.body.data[0]).to.have.property('name');
      expect(res.body.data[0]).to.have.property('price');
      expect(res.body.meta.total).to.equal(3);
      expect(res.body.meta.page).to.equal(1);
    });

    it('should return products for admin', async () => {
      await db.products.bulkCreate([
        { name: 'Zebra', price: 10.00 },
        { name: 'Apple', price: 20.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0].name).to.equal('Zebra');
      expect(res.body.data[1].name).to.equal('Apple');
    });

    
    it('should paginate results correctly', async () => {
      
      const products = Array.from({ length: 25 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: (i + 1) * 10,
      }));
      await db.products.bulkCreate(products);

      const res = await request(app)
        .get(`${API_BASE}/products?page=1&limit=10`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(10);
      expect(res.body.meta.page).to.equal(1);
      expect(res.body.meta.limit).to.equal(10);
      expect(res.body.meta.total).to.equal(25);
      expect(res.body.meta.totalPages).to.equal(3);
      expect(res.body.meta.hasNextPage).to.be.true;
      expect(res.body.meta.hasPrevPage).to.be.false;
    });

    it('should return second page correctly', async () => {
      const products = Array.from({ length: 25 }, (_, i) => ({
        name: `Product ${i + 1}`,
        price: (i + 1) * 10,
      }));
      await db.products.bulkCreate(products);

      const res = await request(app)
        .get(`${API_BASE}/products?page=2&limit=10`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(10);
      expect(res.body.meta.page).to.equal(2);
      expect(res.body.meta.hasNextPage).to.be.true;
      expect(res.body.meta.hasPrevPage).to.be.true;
    });

    it('should enforce max limit', async () => {
      await db.products.create({ name: 'Test', price: 10 });

      const res = await request(app)
        .get(`${API_BASE}/products?limit=500`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.meta.limit).to.equal(100); 
    });

    
    it('should sort ascending by name', async () => {
      await db.products.bulkCreate([
        { name: 'Zebra', price: 10.00 },
        { name: 'Apple', price: 20.00 },
        { name: 'Banana', price: 15.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=name`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data[0].name).to.equal('Apple');
      expect(res.body.data[1].name).to.equal('Banana');
      expect(res.body.data[2].name).to.equal('Zebra');
    });

    it('should sort descending by price', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.00 },
        { name: 'Expensive', price: 100.00 },
        { name: 'Medium', price: 50.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=-price`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(parseFloat(res.body.data[0].price)).to.equal(100.00);
      expect(parseFloat(res.body.data[1].price)).to.equal(50.00);
      expect(parseFloat(res.body.data[2].price)).to.equal(5.00);
    });

    it('should sort by multiple fields', async () => {
      await db.products.bulkCreate([
        { name: 'Apple', price: 20.00 },
        { name: 'Apple', price: 10.00 },
        { name: 'Banana', price: 15.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=name,price`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data[0].name).to.equal('Apple');
      expect(parseFloat(res.body.data[0].price)).to.equal(10.00);
      expect(res.body.data[1].name).to.equal('Apple');
      expect(parseFloat(res.body.data[1].price)).to.equal(20.00);
    });

    it('should return 400 for invalid sort field', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products?sort=invalidField`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(res.body.message).to.include('Invalid sort field');
    });

    
    it('should filter by name (LIKE)', async () => {
      await db.products.bulkCreate([
        { name: 'Pizza Margherita', price: 10.00 },
        { name: 'Pizza Pepperoni', price: 12.00 },
        { name: 'Burger', price: 8.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?name=pizza`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(2);
      expect(res.body.data.every(p => p.name.toLowerCase().includes('pizza'))).to.be.true;
    });

    it('should filter by price range', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.00 },
        { name: 'Medium', price: 15.00 },
        { name: 'Expensive', price: 100.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?minPrice=10&maxPrice=50`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(1);
      expect(res.body.data[0].name).to.equal('Medium');
    });

    it('should filter by minimum price', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.00 },
        { name: 'Medium', price: 15.00 },
        { name: 'Expensive', price: 100.00 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?minPrice=10`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(2);
      expect(res.body.data.every(p => parseFloat(p.price) >= 10)).to.be.true;
    });

    it('should combine pagination, sorting and filtering', async () => {
      
      const pizzas = Array.from({ length: 15 }, (_, i) => ({
        name: `Pizza ${i + 1}`,
        price: (i + 1) * 2,
      }));
      await db.products.bulkCreate(pizzas);
      await db.products.create({ name: 'Burger', price: 10 });

      const res = await request(app)
        .get(`${API_BASE}/products?name=pizza&sort=-price&page=1&limit=5`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).to.have.lengthOf(5);
      expect(res.body.meta.total).to.equal(15);
      
      expect(parseFloat(res.body.data[0].price)).to.equal(30);
    });
  });

  describe(`GET ${API_BASE}/products/:id`, () => {
    it('should return a single product by ID', async () => {
      const product = await db.products.create({
        name: 'Test Product',
        price: 15.50,
      });

      const res = await request(app)
        .get(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).to.have.property('id', product.id);
      expect(res.body).to.have.property('name', 'Test Product');
      expect(parseFloat(res.body.price)).to.equal(15.50);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/invalid-id`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('Validation');
    });
  });

  describe(`POST ${API_BASE}/products`, () => {
    it('should return 403 when employee tries to create product', async () => {
      const newProduct = {
        name: 'New Product',
        price: 25.99,
      };

      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send(newProduct)
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should create a new product with manager token', async () => {
      const newProduct = {
        name: 'New Product',
        price: 25.99,
      };

      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send(newProduct)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'New Product');
      expect(parseFloat(res.body.price)).to.equal(25.99);

      const dbProduct = await db.products.findByPk(res.body.id);
      expect(dbProduct).to.not.be.null;
    });

    it('should create a new product with admin token', async () => {
      const newProduct = {
        name: 'Admin Product',
        price: 99.99,
      };

      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(newProduct)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'Admin Product');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10.00 })
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('Validation');
    });

    it('should return 409 for duplicate product name', async () => {
      await db.products.create({ name: 'Unique Product', price: 10.00 });

      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Unique Product', price: 20.00 })
        .expect(409);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.code).to.equal('CONFLICT');
    });
  });

  describe(`PUT ${API_BASE}/products/:id`, () => {
    it('should return 403 when employee tries to update', async () => {
      const product = await db.products.create({
        name: 'Original Name',
        price: 10.00,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Name', price: 15.00 })
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should update an existing product with manager token', async () => {
      const product = await db.products.create({
        name: 'Original Name',
        price: 10.00,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Name', price: 15.00 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Updated Name');
      expect(parseFloat(res.body.price)).to.equal(15.00);

      const updated = await db.products.findByPk(product.id);
      expect(updated.name).to.equal('Updated Name');
    });

    it('should return 404 when updating non-existent product', async () => {
      const res = await request(app)
        .put(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Product', price: 10.00 })
        .expect(404);

      expect(res.body).to.have.property('success', false);
    });

    it('should allow partial updates', async () => {
      const product = await db.products.create({
        name: 'Test Product',
        price: 10.00,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 20.00 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Test Product');
      expect(parseFloat(res.body.price)).to.equal(20.00);
    });
  });

  describe(`DELETE ${API_BASE}/products/:id`, () => {
    it('should return 403 when employee tries to delete', async () => {
      const product = await db.products.create({
        name: 'To Be Deleted',
        price: 10.00,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should return 403 when manager tries to delete', async () => {
      const product = await db.products.create({
        name: 'Manager Delete Attempt',
        price: 10.00,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body).to.have.property('error');
    });

    it('should delete an existing product with admin token', async () => {
      const product = await db.products.create({
        name: 'To Be Deleted',
        price: 10.00,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).to.have.property('deleted', true);

      const deleted = await db.products.findByPk(product.id);
      expect(deleted).to.be.null;
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.code).to.equal('NOT_FOUND');
    });
  });
});
