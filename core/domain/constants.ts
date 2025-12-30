/**
 * Application-wide constants organized by domain category.
 * Centralized source of truth for all literal values used across layers.
 */

// ============================================================================
// Time & Durations
// ============================================================================
export const TIME_CONSTANTS = {
    MINUTE_MS: 60 * 1000,
    HOUR_MS: 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,
} as const;

// ============================================================================
// Authentication & Security
// ============================================================================
export const AUTH_CONSTANTS = {
    COOKIE_NAME: 'token',
    COOKIE_EXPIRES_DAYS: 7,
    COOKIE_EXPIRES_MS: 7 * TIME_CONSTANTS.DAY_MS, // 7 days
    LOCAL_DOMAIN: '.localhost',
    PASSWORD_RESET_TOKEN_BYTES: 32,
    PASSWORD_RESET_EXPIRATION_MS: TIME_CONSTANTS.HOUR_MS, // 1 hour
} as const;

export const SECURITY_CONSTANTS = {
    // Only redact specific sensitive credentials/tokens
    SENSITIVE_FIELDS: ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'creditCard', 'cvv', 'auth', 'credentials'],
    SENSITIVE_HEADERS: ['authorization', 'cookie', 'x-api-key'],
} as const;

export const JWT_CONSTANTS = {
    EXPIRATION: '7d',
    ALGORITHM: 'HS256',
} as const;

// ============================================================================
// Network & Infra (CORS, Proxy, Domains)
// ============================================================================
export const DOMAIN_CONSTANTS = {
    LOCAL_LOCALHOST: '.localhost',
    LOCAL_NIPIO: '.nip.io',
    NIPIO_PARTS: 6,
} as const;

export const CORS_CONSTANTS: {
    MAX_AGE_SECONDS: number;
    METHODS: string[];
    ALLOWED_HEADERS: string[];
} = {
    MAX_AGE_SECONDS: TIME_CONSTANTS.DAY_MS,
    METHODS: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
    ALLOWED_HEADERS: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
        "Origin",
        "x-tenant-id",
        "x-tenant-slug"
    ],
};

// ============================================================================
// Rate Limiting
// ============================================================================
export const RATE_LIMIT_CONSTANTS = {
    WINDOW_MINUTES: 15,
    MAX_PRODUCTION: 100,
    MAX_DEVELOPMENT: 1000,
} as const;

// ============================================================================
// Multi-Tenancy
// ============================================================================
export const TENANT_CONSTANTS = {
    DEFAULT_SLUG: 'main',
} as const;

// ============================================================================
// Resource & Validation
// ============================================================================
export const VALIDATION_CONSTANTS = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024, // 5MB
} as const;

// ============================================================================
// Environment Identifiers & Helpers
// ============================================================================
export const ENV_CONSTANTS = {
    PRODUCTION: 'production',
    DEVELOPMENT: 'development',
    DEV: 'dev',
} as const;

/**
 * Check if the given environment is a development environment
 */
export function isDevelopment(env: string): boolean {
    return env === ENV_CONSTANTS.DEV || env === ENV_CONSTANTS.DEVELOPMENT;
}

/**
 * Check if the given environment is production
 */
export function isProduction(env: string): boolean {
    return env === ENV_CONSTANTS.PRODUCTION;
}
