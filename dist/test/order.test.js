"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
const supertest_1 = __importDefault(require("supertest"));
const app = require('../app');
const api = (0, supertest_1.default)(app);
describe('Order routes', () => {
    test('POST /api/order without auth should return 403', async () => {
        const res = await api.post('/api/order').send({});
        expect(res.status).toBe(403);
    });
    test('GET /api/order without auth should return 403', async () => {
        const res = await api.get('/api/order');
        expect(res.status).toBe(403);
    });
});
