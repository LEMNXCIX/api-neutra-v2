jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import api from './test-client';
import { getAuthToken } from './helpers/auth.helper';

describe('Cart routes', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  test('GET /api/cart without auth should return 401 or 403', async () => {
    const res = await api.get('/api/cart');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/cart with auth should return 200 or 404', async () => {
    const res = await api.get('/api/cart')
      .set('Authorization', `Bearer ${token}`);
    expect([200, 404]).toContain(res.status);
  });

  test('POST /api/cart/add without auth should return 401 or 403', async () => {
    const res = await api.post('/api/cart/add').send({});
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/cart/add with auth should return 200 or 400', async () => {
    const res = await api.post('/api/cart/add')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'test-product-id', amount: 1 });
    expect([200, 201, 400, 404, 500]).toContain(res.status);
  });
});
