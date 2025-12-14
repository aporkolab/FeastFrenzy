const request = require('supertest');

const app = require('../server');
const db = require('../model');
const { generateTestToken, createTestUsers } = require('./test_helper');

describe('Products API', () => {
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
    await db.products.destroy({ where: {}, truncate: true });
  });

  describe(`GET ${API_BASE}/products`, () => {
    it('should return 401 without authentication', async () => {
      const res = await request(app).get(`${API_BASE}/products`).expect(401);

      expect(res.body).toHaveProperty('error');
    });

    it('should return empty array when no products exist', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(0);
      expect(res.body.meta.total).toBe(0);
    });

    it('should return all products for authenticated user with pagination meta', async () => {
      await db.products.bulkCreate([
        { name: 'Product A', price: 10.0 },
        { name: 'Product B', price: 20.0 },
        { name: 'Product C', price: 30.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('meta');
      expect(res.body.data).toEqual(expect.any(Array));
      expect(res.body.data).toHaveLength(3);
      expect(res.body.data[0]).toHaveProperty('name');
      expect(res.body.data[0]).toHaveProperty('price');
      expect(res.body.meta.total).toBe(3);
      expect(res.body.meta.page).toBe(1);
    });

    it('should return products for admin', async () => {
      await db.products.bulkCreate([
        { name: 'Zebra', price: 10.0 },
        { name: 'Apple', price: 20.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.data[0].name).toBe('Zebra');
      expect(res.body.data[1].name).toBe('Apple');
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

      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.limit).toBe(10);
      expect(res.body.meta.total).toBe(25);
      expect(res.body.meta.totalPages).toBe(3);
      expect(res.body.meta.hasNextPage).toBe(true);
      expect(res.body.meta.hasPrevPage).toBe(false);
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

      expect(res.body.data).toHaveLength(10);
      expect(res.body.meta.page).toBe(2);
      expect(res.body.meta.hasNextPage).toBe(true);
      expect(res.body.meta.hasPrevPage).toBe(true);
    });

    it('should enforce max limit', async () => {
      await db.products.create({ name: 'Test', price: 10 });

      const res = await request(app)
        .get(`${API_BASE}/products?limit=500`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.meta.limit).toBe(100);
    });

    it('should sort ascending by name', async () => {
      await db.products.bulkCreate([
        { name: 'Zebra', price: 10.0 },
        { name: 'Apple', price: 20.0 },
        { name: 'Banana', price: 15.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=name`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data[0].name).toBe('Apple');
      expect(res.body.data[1].name).toBe('Banana');
      expect(res.body.data[2].name).toBe('Zebra');
    });

    it('should sort descending by price', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.0 },
        { name: 'Expensive', price: 100.0 },
        { name: 'Medium', price: 50.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=-price`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(parseFloat(res.body.data[0].price)).toBe(100.0);
      expect(parseFloat(res.body.data[1].price)).toBe(50.0);
      expect(parseFloat(res.body.data[2].price)).toBe(5.0);
    });

    it('should sort by multiple fields', async () => {
      await db.products.bulkCreate([
        { name: 'Apple Premium', price: 20.0 },
        { name: 'Apple Basic', price: 10.0 },
        { name: 'Banana', price: 15.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?sort=name,price`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      // Sorted by name first, then by price
      expect(res.body.data[0].name).toBe('Apple Basic');
      expect(res.body.data[1].name).toBe('Apple Premium');
      expect(res.body.data[2].name).toBe('Banana');
    });

    it('should return 400 for invalid sort field', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products?sort=invalidField`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(res.body.error.message).toContain('Invalid sort field');
    });

    it('should filter by name (LIKE)', async () => {
      await db.products.bulkCreate([
        { name: 'Pizza Margherita', price: 10.0 },
        { name: 'Pizza Pepperoni', price: 12.0 },
        { name: 'Burger', price: 8.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?name=pizza`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(p => p.name.toLowerCase().includes('pizza')))
        .toBe(true);
    });

    it('should filter by price range', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.0 },
        { name: 'Medium', price: 15.0 },
        { name: 'Expensive', price: 100.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?minPrice=10&maxPrice=50`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].name).toBe('Medium');
    });

    it('should filter by minimum price', async () => {
      await db.products.bulkCreate([
        { name: 'Cheap', price: 5.0 },
        { name: 'Medium', price: 15.0 },
        { name: 'Expensive', price: 100.0 },
      ]);

      const res = await request(app)
        .get(`${API_BASE}/products?minPrice=10`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body.data).toHaveLength(2);
      expect(res.body.data.every(p => parseFloat(p.price) >= 10)).toBe(true);
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

      expect(res.body.data).toHaveLength(5);
      expect(res.body.meta.total).toBe(15);

      expect(parseFloat(res.body.data[0].price)).toBe(30);
    });
  });

  describe(`GET ${API_BASE}/products/:id`, () => {
    it('should return a single product by ID', async () => {
      const product = await db.products.create({
        name: 'Test Product',
        price: 15.5,
      });

      const res = await request(app)
        .get(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('id', product.id);
      expect(res.body).toHaveProperty('name', 'Test Product');
      expect(parseFloat(res.body.price)).toBe(15.5);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error).toHaveProperty('code', 'NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get(`${API_BASE}/products/invalid-id`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Validation');
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

      expect(res.body).toHaveProperty('error');
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

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'New Product');
      expect(parseFloat(res.body.price)).toBe(25.99);

      const dbProduct = await db.products.findByPk(res.body.id);
      expect(dbProduct).not.toBeNull();
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

      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('name', 'Admin Product');
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 10.0 })
        .expect(400);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.message).toContain('Validation');
    });

    it('should return 409 for duplicate product name', async () => {
      await db.products.create({ name: 'Unique Product', price: 10.0 });

      const res = await request(app)
        .post(`${API_BASE}/products`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Unique Product', price: 20.0 })
        .expect(409);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.code).toBe('CONFLICT');
    });
  });

  describe(`PUT ${API_BASE}/products/:id`, () => {
    it('should return 403 when employee tries to update', async () => {
      const product = await db.products.create({
        name: 'Original Name',
        price: 10.0,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .send({ name: 'Updated Name', price: 15.0 })
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should update an existing product with manager token', async () => {
      const product = await db.products.create({
        name: 'Original Name',
        price: 10.0,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .send({ name: 'Updated Name', price: 15.0 })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Updated Name');
      expect(parseFloat(res.body.price)).toBe(15.0);

      const updated = await db.products.findByPk(product.id);
      expect(updated.name).toBe('Updated Name');
    });

    it('should return 404 when updating non-existent product', async () => {
      const res = await request(app)
        .put(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Ghost Product', price: 10.0 })
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
    });

    it('should allow partial updates', async () => {
      const product = await db.products.create({
        name: 'Test Product',
        price: 10.0,
      });

      const res = await request(app)
        .put(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ price: 20.0 })
        .expect(200);

      expect(res.body).toHaveProperty('name', 'Test Product');
      expect(parseFloat(res.body.price)).toBe(20.0);
    });
  });

  describe(`DELETE ${API_BASE}/products/:id`, () => {
    it('should return 403 when employee tries to delete', async () => {
      const product = await db.products.create({
        name: 'To Be Deleted',
        price: 10.0,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${employeeToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should return 403 when manager tries to delete', async () => {
      const product = await db.products.create({
        name: 'Manager Delete Attempt',
        price: 10.0,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${managerToken}`)
        .expect(403);

      expect(res.body).toHaveProperty('error');
    });

    it('should delete an existing product with admin token', async () => {
      const product = await db.products.create({
        name: 'To Be Deleted',
        price: 10.0,
      });

      const res = await request(app)
        .delete(`${API_BASE}/products/${product.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toHaveProperty('deleted', true);

      const deleted = await db.products.findByPk(product.id);
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete(`${API_BASE}/products/99999`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);

      expect(res.body).toHaveProperty('success', false);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });
});
