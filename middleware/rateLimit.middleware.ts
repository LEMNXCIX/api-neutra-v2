import rateLimit from "express-rate-limit";
import config from "@/config/index.config";
import { TIME_CONSTANTS, isDevelopment } from "@/core/domain/constants";
import { RATE_LIMIT_CONSTANTS } from "@/config/infrastructure-constants";

const ENVIRONMENT: string = config.ENVIRONMENT;

const isDev = isDevelopment(ENVIRONMENT);

const defaultLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONSTANTS.WINDOW_MINUTES * TIME_CONSTANTS.MINUTE_MS,
    max: RATE_LIMIT_CONSTANTS.MAX_PRODUCTION,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});

const devLimiter = rateLimit({
    windowMs: RATE_LIMIT_CONSTANTS.WINDOW_MINUTES * TIME_CONSTANTS.MINUTE_MS,
    max: RATE_LIMIT_CONSTANTS.MAX_DEVELOPMENT,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many requests, please try again later." },
});

// Strict limiter for credential-based endpoints (brute-force mitigation).
const authLimiter = rateLimit({
    windowMs: 15 * TIME_CONSTANTS.MINUTE_MS,
    max: isDev ? 50 : 10,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        error: "Too many authentication attempts, please try again later.",
    },
});

export { authLimiter };

export default function rateLimiter() {
    return isDev ? devLimiter : defaultLimiter;
}
