jest.mock('uuid', () => ({ v4: () => `test-uuid-${Math.random().toString(36).substring(7)}` }));
import api from './test-client';

describe('Categories routes', () => {
    test('GET /api/categories should respond with structured data', async () => {
        const res = await api.get('/api/categories');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty('categories');
        expect(res.body.data).toHaveProperty('stats');
        expect(res.body.data).toHaveProperty('pagination');
        expect(Array.isArray(res.body.data.categories)).toBe(true);
    });
});
