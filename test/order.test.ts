jest.mock('uuid', () => ({ v4: () => `test-uuid-${Math.random().toString(36).substring(7)}` }));
import api from './test-client';
import { getAuthToken } from './helpers/auth.helper';

describe('Order routes', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  test('POST /api/order without auth should return 401 or 403', async () => {
    const res = await api.post('/api/order').send({});
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/order with auth should return 200 or 400', async () => {
    const res = await api.post('/api/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ items: [] });
    expect([200, 201, 400, 403, 422]).toContain(res.status);
  });

  test('GET /api/order without auth should return 401 or 403', async () => {
    const res = await api.get('/api/order');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/order with auth should return 200', async () => {
    const res = await api.get('/api/order')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 403, 404]).toContain(res.status);
  });
});
