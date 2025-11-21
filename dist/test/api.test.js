"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('uuid', () => ({ v4: () => 'test-uuid' }));
const supertest_1 = __importDefault(require("supertest"));
const app = require('../app');
const api = (0, supertest_1.default)(app);
test('La raíz de la api ha respondido', async () => {
    await api.get('/').expect(200).expect('Content-Type', /application\/json/);
});
