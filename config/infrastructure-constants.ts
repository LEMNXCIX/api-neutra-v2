import { TIME_CONSTANTS } from "@/core/domain/constants";

export const DOMAIN_CONSTANTS = {
    LOCAL_LOCALHOST: ".localhost",
    LOCAL_NIPIO: ".nip.io",
    NIPIO_PARTS: 6,
} as const;

/**
 * HTTP tenant resolution policy (delivery layer).
 * Paths that may proceed without a resolved store tenant.
 */
export const TENANT_HTTP_CONSTANTS = {
    MANAGEMENT_PATH_PREFIXES: [
        "/api/users",
        "/api/roles",
        "/api/permissions",
        "/api/tenants",
        "/api/admin/stats",
        "/api/auth/login",
        "/api/auth/signup",
        "/api/auth/forgot-password",
        "/api/auth/reset-password",
        "/api/auth/validate",
    ] as readonly string[],
    RESERVED_SUBDOMAINS: ["www", "api"] as readonly string[],
} as const;

/**
 * CORS defaults.
 * - Production: exact allowlist (replace defaults with ALLOWED_ORIGINS env when set).
 * - Development: localhost / private LAN patterns (no need to hardcode IPs).
 *
 * Env: ALLOWED_ORIGINS=https://a.com,https://b.com (comma-separated, exact match)
 */
export const CORS_CONSTANTS = {
    /** Preflight cache in seconds (24h). Note: Access-Control-Max-Age is seconds, not ms. */
    MAX_AGE_SECONDS: TIME_CONSTANTS.DAY_MS / 1000,
    METHODS: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"] as string[],
    ALLOWED_HEADERS: [
        "Content-Type",
        "Authorization",
        "Accept",
        "X-Requested-With",
        "Origin",
        "x-tenant-id",
        "x-tenant-slug",
    ] as string[],
    /** Fallback production origins when ALLOWED_ORIGINS is not set */
    DEFAULT_PRODUCTION_ORIGINS: [
        "https://www.neutra.ec",
        "https://neutra.ec",
        "https://www.admin.neutra.ec",
        "https://admin.neutra.ec",
    ] as readonly string[],
    /**
     * localhost / 127.0.0.1 with optional subdomain (e.g. superadmin.localhost:3000)
     * and any port.
     */
    LOCALHOST_ORIGIN_PATTERN:
        /^https?:\/\/(([\w-]+\.)?localhost|127\.0\.0\.1)(:\d+)?$/i,
    /**
     * Private LAN ranges: 10.x, 172.16-31.x, 192.168.x (any port).
     * Covers mobile testing on the same Wi‑Fi without hardcoding machine IPs.
     */
    PRIVATE_NETWORK_ORIGIN_PATTERN:
        /^https?:\/\/(10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?$/i,
} as const;

export const RATE_LIMIT_CONSTANTS = {
    WINDOW_MINUTES: 15,
    MAX_PRODUCTION: 100,
    MAX_DEVELOPMENT: 1000,
} as const;
