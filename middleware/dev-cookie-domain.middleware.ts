import { Request, Response, NextFunction } from "express";
import config from "@/config/index.config";
import {
    AUTH_CONSTANTS,
    isProduction as checkProduction,
} from "@/core/domain/constants";

const isProd = checkProduction(config.ENVIRONMENT);

/**
 * In local multi-subdomain setups (*.localhost), re-set the auth cookie with
 * a shared domain so tenants on different subdomains keep the session.
 * Delivery-layer concern only (not business logic).
 */
export function devCookieDomainMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (isProd || !req.cookies?.token) {
        next();
        return;
    }

    const host = req.get("host");
    if (host && host.includes(".localhost")) {
        res.cookie(AUTH_CONSTANTS.COOKIE_NAME, req.cookies.token, {
            domain: AUTH_CONSTANTS.LOCAL_DOMAIN,
            path: "/",
            httpOnly: true,
            secure: false,
            sameSite: "lax",
            expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
        });
    }

    next();
}

export default devCookieDomainMiddleware;
