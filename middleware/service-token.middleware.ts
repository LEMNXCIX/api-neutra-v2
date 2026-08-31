import { Request, Response, NextFunction } from "express";
import { extractAuthToken } from "@/helpers/auth-token.helpers";

/**
 * Allows a static service token (TENANTS_API_TOKEN env) to bypass JWT auth
 * for machine-to-machine reads (e.g. the CMS tenant selector).
 * If the header doesn't match, falls through to the normal authenticate flow.
 */
export function serviceTokenOr(authenticate: (req: Request, res: Response, next: NextFunction) => void) {
    return (req: Request, res: Response, next: NextFunction) => {
        const expected = process.env.TENANTS_API_TOKEN;
        const provided = req.get("x-api-token") || extractAuthToken(req);
        if (expected && provided && provided === expected) {
            return next();
        }
        return authenticate(req, res, next);
    };
}
