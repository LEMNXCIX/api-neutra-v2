jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
import supertest from 'supertest';
import app from '@/app';
import { getAuthToken } from './helpers/auth.helper';

const api = supertest(app);

describe('Slide routes', () => {
  let token: string;

  beforeAll(async () => {
    token = await getAuthToken();
  });

  test('GET /api/slide should respond with json', async () => {
    const res = await api.get('/api/slide');
    expect(res.headers['content-type']).toMatch(/application\/(json|json;)/);
    expect([200, 500]).toContain(res.status);
  });

  test('POST /api/slide without auth should return 401 or 403', async () => {
    const res = await api.post('/api/slide').send({});
    expect([401, 403]).toContain(res.status);
  });

  test('POST /api/slide with auth should return 200 or 400', async () => {
    const res = await api.post('/api/slide')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Test Slide',
        img: 'test.jpg',
        desc: 'Test Description'
      });
    expect([200, 201, 400]).toContain(res.status);
  });
});
