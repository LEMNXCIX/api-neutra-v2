jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('@/app');
const api = supertest(app);

describe('Cart routes', () => {
  test('GET /api/cart without auth should return 403', async () => {
    const res = await api.get('/api/cart');
    expect(res.status).toBe(403);
  });

  test('POST /api/cart/add without auth should return 403', async () => {
    const res = await api.post('/api/cart/add').send({});
    expect(res.status).toBe(403);
  });
});
