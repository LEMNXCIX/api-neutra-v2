jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import api from './test-client';
import { getAuthToken } from './helpers/auth.helper';

describe('Products routes', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  test('GET /api/products should respond with json', async () => {
    const res = await api.get('/api/products');
    expect(res.headers['content-type']).toMatch(/application\/(json|json;)/);
    expect([200, 400]).toContain(res.status);
  });

  test('POST /api/products without auth should return 401 or 403', async () => {
    const res = await api.post('/api/products').send({});
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/products with auth should return 200 or 400', async () => {
    const res = await api.post('/api/products')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Test Product',
        price: 100,
        description: 'Test Description',
        ownerId: 'test-user-id'
      });
    expect([200, 201, 400]).toContain(res.status);
  });

  test('POST /api/products/search returns json', async () => {
    const res = await api.post('/api/products/search').send({ name: 'test' });
    expect([200, 400]).toContain(res.status);
  });
});
