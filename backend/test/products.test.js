const request = require('supertest');
const { expect } = require('chai');
const app = require('../server');
const db = require('../model');

describe('Products API', () => {
  
  before(async () => {
    process.env.NODE_ENV = 'test';
    await db.sequelize.sync({ force: true });
  });

  
  beforeEach(async () => {
    await db.products.destroy({ where: {}, truncate: true });
  });

  

  describe('GET /products', () => {
    it('should return empty array when no products exist', async () => {
      const res = await request(app)
        .get('/products')
        .expect(200);

      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(0);
    });

    it('should return all products', async () => {
      
      await db.products.bulkCreate([
        { name: 'Product A', price: 10.00 },
        { name: 'Product B', price: 20.00 },
        { name: 'Product C', price: 30.00 },
      ]);

      
      const res = await request(app)
        .get('/products')
        .expect(200);

      
      expect(res.body).to.be.an('array');
      expect(res.body).to.have.lengthOf(3);
      expect(res.body[0]).to.have.property('name');
      expect(res.body[0]).to.have.property('price');
    });

    it('should return products in correct order', async () => {
      await db.products.bulkCreate([
        { name: 'Zebra', price: 10.00 },
        { name: 'Apple', price: 20.00 },
      ]);

      const res = await request(app)
        .get('/products')
        .expect(200);

      
      expect(res.body[0].name).to.equal('Zebra');
      expect(res.body[1].name).to.equal('Apple');
    });
  });

  describe('GET /products/:id', () => {
    it('should return a single product by ID', async () => {
      const product = await db.products.create({
        name: 'Test Product',
        price: 15.50,
      });

      const res = await request(app)
        .get(`/products/${product.id}`)
        .expect(200);

      expect(res.body).to.have.property('id', product.id);
      expect(res.body).to.have.property('name', 'Test Product');
      expect(parseFloat(res.body.price)).to.equal(15.50);
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app)
        .get('/products/99999')
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error).to.have.property('code', 'NOT_FOUND');
    });

    it('should return 400 for invalid ID format', async () => {
      const res = await request(app)
        .get('/products/invalid-id')
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('Validation');
    });
  });

  describe('POST /products', () => {
    it('should create a new product with valid data', async () => {
      const newProduct = {
        name: 'New Product',
        price: 25.99,
      };

      const res = await request(app)
        .post('/products')
        .send(newProduct)
        .expect(201);

      expect(res.body).to.have.property('id');
      expect(res.body).to.have.property('name', 'New Product');
      expect(parseFloat(res.body.price)).to.equal(25.99);

      
      const dbProduct = await db.products.findByPk(res.body.id);
      expect(dbProduct).to.not.be.null;
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(app)
        .post('/products')
        .send({ price: 10.00 }) 
        .expect(400);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.message).to.include('Validation');
    });

    it('should return 409 for duplicate product name', async () => {
      await db.products.create({ name: 'Unique Product', price: 10.00 });

      const res = await request(app)
        .post('/products')
        .send({ name: 'Unique Product', price: 20.00 })
        .expect(409);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.code).to.equal('CONFLICT');
    });
  });

  describe('PUT /products/:id', () => {
    it('should update an existing product', async () => {
      const product = await db.products.create({
        name: 'Original Name',
        price: 10.00,
      });

      const res = await request(app)
        .put(`/products/${product.id}`)
        .send({ name: 'Updated Name', price: 15.00 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Updated Name');
      expect(parseFloat(res.body.price)).to.equal(15.00);

      
      const updated = await db.products.findByPk(product.id);
      expect(updated.name).to.equal('Updated Name');
    });

    it('should return 404 when updating non-existent product', async () => {
      const res = await request(app)
        .put('/products/99999')
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
        .put(`/products/${product.id}`)
        .send({ price: 20.00 })
        .expect(200);

      expect(res.body).to.have.property('name', 'Test Product');
      expect(parseFloat(res.body.price)).to.equal(20.00);
    });
  });

  describe('DELETE /products/:id', () => {
    it('should delete an existing product', async () => {
      const product = await db.products.create({
        name: 'To Be Deleted',
        price: 10.00,
      });

      const res = await request(app)
        .delete(`/products/${product.id}`)
        .expect(200);

      expect(res.body).to.have.property('deleted', true);

      
      const deleted = await db.products.findByPk(product.id);
      expect(deleted).to.be.null;
    });

    it('should return 404 when deleting non-existent product', async () => {
      const res = await request(app)
        .delete('/products/99999')
        .expect(404);

      expect(res.body).to.have.property('success', false);
      expect(res.body.error.code).to.equal('NOT_FOUND');
    });
  });
});
