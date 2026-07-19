import cors, { CorsOptions } from "cors";
import { RequestHandler } from "express";
import config from "@/config/index.config";
import { isProduction as checkProduction } from "@/core/domain/constants";
import { CORS_CONSTANTS } from "@/config/infrastructure-constants";
import logger from "@/helpers/logger.helpers";

export type CorsPolicyOptions = {
    isProduction: boolean;
    /** Comma-separated or already-split origins from config/env */
    allowedOrigins: string | string[];
};

/**
 * Parse comma-separated origins (trimmed, empty entries dropped).
 */
export function parseOriginsList(value: string | string[] | undefined): string[] {
    if (!value) return [];
    const raw = Array.isArray(value) ? value : value.split(",");
    return raw.map((o) => o.trim()).filter(Boolean);
}

/**
 * Build static allowlist for exact-match origins.
 * - If ALLOWED_ORIGINS is set: use only those (prod replaces defaults).
 * - If production and empty: use DEFAULT_PRODUCTION_ORIGINS.
 * - If development and empty: empty set (patterns cover localhost/LAN).
 */
export function buildStaticAllowlist(
    options: CorsPolicyOptions,
): ReadonlySet<string> {
    const fromConfig = parseOriginsList(options.allowedOrigins);
    if (fromConfig.length > 0) {
        return new Set(fromConfig);
    }
    if (options.isProduction) {
        return new Set(CORS_CONSTANTS.DEFAULT_PRODUCTION_ORIGINS);
    }
    return new Set();
}

/**
 * Returns true if the request Origin is allowed.
 * - No Origin: allowed only outside production (curl, Postman, server-to-server).
 * - Exact match against env / production defaults.
 * - In non-production: localhost and private network patterns.
 */
export function isOriginAllowed(
    origin: string | undefined,
    options: CorsPolicyOptions = {
        isProduction: checkProduction(config.ENVIRONMENT),
        allowedOrigins: config.allowedOrigins,
    },
): boolean {
    const allowlist = buildStaticAllowlist(options);

    if (!origin) {
        return !options.isProduction;
    }

    if (allowlist.has(origin)) {
        return true;
    }

    if (!options.isProduction) {
        return (
            CORS_CONSTANTS.LOCALHOST_ORIGIN_PATTERN.test(origin) ||
            CORS_CONSTANTS.PRIVATE_NETWORK_ORIGIN_PATTERN.test(origin)
        );
    }

    return false;
}

/**
 * Build cors package options from policy (testable without Express).
 */
export function createCorsOptions(
    policy: CorsPolicyOptions = {
        isProduction: checkProduction(config.ENVIRONMENT),
        allowedOrigins: config.allowedOrigins,
    },
): CorsOptions {
    return {
        origin(origin, callback) {
            if (isOriginAllowed(origin, policy)) {
                callback(null, true);
                return;
            }

            logger.warn(
                `CORS blocked request from origin: ${origin ?? "undefined"}`,
            );
            callback(null, false);
        },
        credentials: true,
        methods: CORS_CONSTANTS.METHODS,
        allowedHeaders: CORS_CONSTANTS.ALLOWED_HEADERS,
        exposedHeaders: ["Set-Cookie"],
        maxAge: CORS_CONSTANTS.MAX_AGE_SECONDS,
        optionsSuccessStatus: 204,
    };
}

/**
 * Single CORS middleware (package only).
 * Do not stack a second manual Access-Control-* middleware — it conflicts
 * with credentials:true (e.g. Allow-Origin: * is invalid with credentials).
 */
export function corsMiddleware(
    policy?: CorsPolicyOptions,
): RequestHandler {
    return cors(createCorsOptions(policy));
}

export default corsMiddleware;
