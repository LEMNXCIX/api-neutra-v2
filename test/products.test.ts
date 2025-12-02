jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('@/app');
const api = supertest(app);

describe('Products routes', () => {
  test('GET /api/products should respond with json', async () => {
    const res = await api.get('/api/products');
    expect(res.headers['content-type']).toMatch(/application\/(json|json;)/);
    expect([200, 400]).toContain(res.status);
  });

  test('POST /api/products without auth should return 403', async () => {
    const res = await api.post('/api/products').send({});
    expect(res.status).toBe(403);
  });

  test('POST /api/products/search returns json', async () => {
    const res = await api.post('/api/products/search').send({ name: 'test' });
    expect([200, 400]).toContain(res.status);
  });
});
