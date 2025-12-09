// ============================================================================
// Time Constants
// ============================================================================
// MINUTE_MS: number of milliseconds in one minute
export const MINUTE_MS = 60 * 1000;

// ============================================================================
// Rate Limit Constants
// ============================================================================
export const RATE_LIMIT_WINDOW_MINUTES = 15; // Duration of the rate limit window in minutes
export const RATE_LIMIT_MAX_PRODUCTION = 100; // Max requests in production environment
export const RATE_LIMIT_MAX_DEVELOPMENT = 1000; // Max requests in development environment

// ============================================================================
// JWT Constants
// ============================================================================
export const JWT_EXPIRATION = '7d'; // Token expiration time (7 days)
export const JWT_ALGORITHM = 'HS256'; // JWT signing algorithm

// ============================================================================
// Environment Constants
// ============================================================================
export const ENV_PRODUCTION = 'production'; // Production environment identifier
export const ENV_DEVELOPMENT = 'development'; // Development environment identifier
export const ENV_DEV = 'dev'; // Short development environment identifier

// ============================================================================
// Validation Constants
// ============================================================================
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================================================
// Environment Helper Functions
// ============================================================================

/**
 * Check if the given environment is a development environment
 * @param env - The environment string to check
 * @returns true if environment is 'dev' or 'development', false otherwise
 */
export function isDevelopment(env: string): boolean {
    return env === ENV_DEV || env === ENV_DEVELOPMENT;
}

/**
 * Check if the given environment is production
 * @param env - The environment string to check
 * @returns true if environment is 'production', false otherwise
 */
export function isProduction(env: string): boolean {
    return env === ENV_PRODUCTION;
}
