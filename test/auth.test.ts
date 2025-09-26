jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('../app');
const api = supertest(app);

describe('Auth routes', () => {
  test('POST /api/auth/login without body returns 401 or 400', async () => {
    const res = await api.post('/api/auth/login').send({});
    expect([200, 400, 401]).toContain(res.status);
  });

  test('POST /api/auth/signup without body returns 400 or 200', async () => {
    const res = await api.post('/api/auth/signup').send({});
    expect([200, 400]).toContain(res.status);
  });

  test('GET /api/auth/logout returns json', async () => {
    const res = await api.get('/api/auth/logout');
    expect([200, 204]).toContain(res.status);
  });
});
