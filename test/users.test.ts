jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import api from './test-client';
import { getAuthToken } from './helpers/auth.helper';

describe('Users routes', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  test('GET /api/users without auth should return 401 or 403', async () => {
    const res = await api.get('/api/users');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/users with auth should return 200', async () => {
    const res = await api.get('/api/users')
      .set('Authorization', `Bearer ${token}`);
    expect([200]).toContain(res.status);
  });

  test('GET /api/users/find/:id without auth should return 401 or 403', async () => {
    const res = await api.get('/api/users/find/123');
    expect([401, 403]).toContain(res.status);
  });

  test('GET /api/users/stats without auth should return 401 or 403', async () => {
    const res = await api.get('/api/users/stats');
    expect([401, 403]).toContain(res.status);
  });
});
