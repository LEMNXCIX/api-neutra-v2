"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const config = require('../config/index.config');
const constants = require('../config/constants.config');
const ENVIRONMENT = config.ENVIRONMENT;
const MINUTE_MS = constants.MINUTE_MS;
const isDev = ENVIRONMENT === 'dev' || ENVIRONMENT === 'development';
const defaultLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * MINUTE_MS,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
});
const devLimiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * MINUTE_MS,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
});
module.exports = function rateLimiter() {
    return isDev ? devLimiter : defaultLimiter;
};
