jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('@/app');
const api = supertest(app);

describe('Order routes', () => {
  test('POST /api/order without auth should return 403', async () => {
    const res = await api.post('/api/order').send({});
    expect(res.status).toBe(403);
  });

  test('GET /api/order without auth should return 403', async () => {
    const res = await api.get('/api/order');
    expect(res.status).toBe(403);
  });
});
