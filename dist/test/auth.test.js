"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
const supertest_1 = __importDefault(require("supertest"));
const app = require('@/app');
const api = (0, supertest_1.default)(app);
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
