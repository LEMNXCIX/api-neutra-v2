const rateLimit = require('express-rate-limit');
const { ENVIRONMENT } = require('../config/index.config');
const { MINUTE_MS } = require('../config/constants.config');

// In development we relax rate limits to avoid interfering with local testing.
const isDev = ENVIRONMENT === 'dev' || ENVIRONMENT === 'development';

// Default limiter: 100 requests per 15 minutes per IP
const defaultLimiter = rateLimit({
  windowMs: 15 * MINUTE_MS, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: { error: 'Too many requests, please try again later.' },
});

// Relaxed limiter for development: 1000 requests per 15 minutes
const devLimiter = rateLimit({
  windowMs: 15 * MINUTE_MS,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = function rateLimiter() {
  return isDev ? devLimiter : defaultLimiter;
};
