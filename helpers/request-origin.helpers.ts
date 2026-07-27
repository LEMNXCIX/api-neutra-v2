import { Request } from "express";

/**
 * Resolve the client-facing origin for redirects, emails, and deep links.
 * Prefers explicit proxy/header overrides, then Origin/Referer, then host.
 */
export function resolveRequestOrigin(req: Request): string {
    const original = req.headers["x-original-origin"];
    if (typeof original === "string" && original.trim()) {
        return original.trim();
    }

    if (typeof req.headers.origin === "string" && req.headers.origin.trim()) {
        return req.headers.origin.trim();
    }

    const referer = req.headers.referer;
    if (typeof referer === "string" && referer.trim()) {
        try {
            return new URL(referer).origin;
        } catch {
            // fall through
        }
    }

    return `${req.protocol}://${req.get("host")}`;
}
