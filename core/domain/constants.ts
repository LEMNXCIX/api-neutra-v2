/**
 * Application-wide constants organized by domain category.
 * Centralized source of truth for all literal values used across layers.
 * Infrastructure-only constants (CORS, RATE_LIMIT, DOMAIN) moved to config/infrastructure-constants.ts
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
    COOKIE_NAME: "token",
    COOKIE_EXPIRES_DAYS: 7,
    COOKIE_EXPIRES_MS: 7 * TIME_CONSTANTS.DAY_MS,
    LOCAL_DOMAIN: ".localhost",
    PASSWORD_RESET_TOKEN_BYTES: 32,
    PASSWORD_RESET_EXPIRATION_MS: TIME_CONSTANTS.HOUR_MS,
} as const;

export const SECURITY_CONSTANTS = {
    SENSITIVE_FIELDS: [
        "password",
        "token",
        "accessToken",
        "refreshToken",
        "secret",
        "apiKey",
        "creditCard",
        "cvv",
        "auth",
        "credentials",
    ],
    SENSITIVE_HEADERS: ["authorization", "cookie", "x-api-key"],
} as const;

export const JWT_CONSTANTS = {
    EXPIRATION: "7d",
    ALGORITHM: "HS256",
} as const;

// ============================================================================
// Multi-Tenancy
// ============================================================================
export const TENANT_CONSTANTS = {
    DEFAULT_SLUG: "main",
} as const;

// ============================================================================
// Resource & Validation
// ============================================================================
export const VALIDATION_CONSTANTS = {
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    MAX_IMAGE_SIZE_BYTES: 5 * 1024 * 1024,
} as const;

// ============================================================================
// Environment Identifiers & Helpers
// ============================================================================
export const ENV_CONSTANTS = {
    PRODUCTION: "production",
    DEVELOPMENT: "development",
    DEV: "dev",
} as const;

export function isDevelopment(env: string): boolean {
    return env === ENV_CONSTANTS.DEV || env === ENV_CONSTANTS.DEVELOPMENT;
}

export function isProduction(env: string): boolean {
    return env === ENV_CONSTANTS.PRODUCTION;
}
