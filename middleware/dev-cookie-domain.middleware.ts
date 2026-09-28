import type { NextFunction, Request, Response } from "express";
import config from "@/config/index.config";
import {
    AUTH_CONSTANTS,
    isProduction as checkProduction,
} from "@/core/domain/constants";

const isProd = checkProduction(config.ENVIRONMENT);

/**
 * In local multi-subdomain setups (*.localhost), re-set the auth cookie as a
 * host-only cookie. Delivery-layer concern only (not business logic).
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
    if (host?.includes(".localhost")) {
        res.cookie(AUTH_CONSTANTS.COOKIE_NAME, req.cookies.token, {
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
