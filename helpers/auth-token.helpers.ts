import { Request } from "express";
import { AUTH_CONSTANTS } from "@/core/domain/constants";

/**
 * Extract JWT from cookie (preferred) or Authorization Bearer header.
 * Shared by authenticate / optionalAuthenticate middlewares.
 */
export function extractAuthToken(req: Request): string | undefined {
    const cookieToken = req.cookies?.[AUTH_CONSTANTS.COOKIE_NAME];
    if (typeof cookieToken === "string" && cookieToken.trim()) {
        return cookieToken.trim();
    }

    const authHeader = req.headers.authorization;
    if (typeof authHeader === "string" && authHeader.startsWith("Bearer ")) {
        const token = authHeader.slice("Bearer ".length).trim();
        return token || undefined;
    }

    return undefined;
}
