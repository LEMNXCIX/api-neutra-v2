import rateLimit from 'express-rate-limit';
import config from '@/config/index.config';
import {
  MINUTE_MS,
  RATE_LIMIT_WINDOW_MINUTES,
  RATE_LIMIT_MAX_PRODUCTION,
  RATE_LIMIT_MAX_DEVELOPMENT,
  isDevelopment,
} from '@/config/constants.config';

const ENVIRONMENT: string = config.ENVIRONMENT;

const isDev = isDevelopment(ENVIRONMENT);

const defaultLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * MINUTE_MS,
  max: RATE_LIMIT_MAX_PRODUCTION,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const devLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MINUTES * MINUTE_MS,
  max: RATE_LIMIT_MAX_DEVELOPMENT,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

export default function rateLimiter() {
  return isDev ? devLimiter : defaultLimiter;
}
