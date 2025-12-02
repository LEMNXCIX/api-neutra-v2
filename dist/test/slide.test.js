"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
const supertest_1 = __importDefault(require("supertest"));
const app = require('@/app');
const api = (0, supertest_1.default)(app);
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
