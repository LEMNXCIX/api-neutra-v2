import rateLimit from 'express-rate-limit';
const config = require('../config/index.config');
const constants = require('../config/constants.config');

const ENVIRONMENT: string = config.ENVIRONMENT;
const MINUTE_MS: number = constants.MINUTE_MS;

const isDev = ENVIRONMENT === 'dev' || ENVIRONMENT === 'development';

const defaultLimiter = rateLimit({
  windowMs: 15 * MINUTE_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const devLimiter = rateLimit({
  windowMs: 15 * MINUTE_MS,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

export = function rateLimiter() {
  return isDev ? devLimiter : defaultLimiter;
};
