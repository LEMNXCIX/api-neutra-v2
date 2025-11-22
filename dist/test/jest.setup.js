"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const db_config_1 = require("../config/db.config");
// Increase default timeout for slow DB operations
jest.setTimeout(20000);
beforeAll(async () => {
    // Ensure DB connection is established for tests that query models
    try {
        await db_config_1.prisma.$connect();
    }
    catch (err) {
        console.error('Test DB connection failed:', err);
    }
});
afterAll(async () => {
    try {
        await db_config_1.prisma.$disconnect();
    }
    catch (err) {
        // ignore
    }
});
