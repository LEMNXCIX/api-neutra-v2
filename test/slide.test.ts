jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
const app = require('../app');
const api = supertest(app);

describe('Slide routes', () => {
  test('GET /api/slide should respond with json', async () => {
    const res = await api.get('/api/slide');
    expect(res.headers['content-type']).toMatch(/application\/(json|json;)/);
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/slide without auth should return 403', async () => {
    const res = await api.post('/api/slide').send({});
    expect(res.status).toBe(403);
  });
});
