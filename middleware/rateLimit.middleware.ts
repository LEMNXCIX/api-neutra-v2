import rateLimit from 'express-rate-limit';
import config from '@/config/index.config';
import { MINUTE_MS } from '@/config/constants.config';

const ENVIRONMENT: string = config.ENVIRONMENT;

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
  message: { error: 'Too many requests, please try again later.' }, // Added message for consistency
});

export default function rateLimiter() {
  return isDev ? devLimiter : defaultLimiter;
}
