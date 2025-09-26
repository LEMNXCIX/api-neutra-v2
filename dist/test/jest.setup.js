"use strict";
const { connection } = require('../config/db.config');
const mongoose = require('mongoose');
// Increase default timeout for slow DB operations
jest.setTimeout(20000);
beforeAll(async () => {
    // Ensure DB connection is established for tests that query models
    try {
        await connection();
    }
    catch (err) {
        // If connection fails, tests may still proceed and return appropriate errors
        // but we log for visibility
        // console.error('Test DB connection failed:', err);
    }
});
afterAll(async () => {
    try {
        await mongoose.disconnect();
    }
    catch (err) {
        // ignore
    }
});
