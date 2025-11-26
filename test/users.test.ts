jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('@/app');
const api = supertest(app);

describe('Users routes', () => {
  test('GET /api/users without auth should return 403', async () => {
    const res = await api.get('/api/users');
    expect(res.status).toBe(403);
  });

  test('GET /api/users/find/:id without auth should return 403', async () => {
    const res = await api.get('/api/users/find/123');
    expect(res.status).toBe(403);
  });

  test('GET /api/users/stats without auth should return 403', async () => {
    const res = await api.get('/api/users/stats');
    expect(res.status).toBe(403);
  });
});
