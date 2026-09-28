import type { CookieOptions, Request, Response } from "express";
import config from "@/config/index.config";
import { DOMAIN_CONSTANTS } from "@/config/infrastructure-constants";
import { AUTH_CONSTANTS, isProduction } from "@/core/domain/constants";
import type { ErrorDetail } from "@/types/api-response";

/**
 * Result bag produced by the auth use cases and the OAuth provider callbacks.
 * It is wrapped into the `StandardResponse` envelope by the response middleware,
 * so its shape is described here instead of being `any`.
 */
interface AuthResult {
    code?: number;
    success?: boolean;
    message?: string;
    token?: string;
    data?: Record<string, unknown>;
    errors?: ErrorDetail[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

const production: boolean = config.production;
const ENVIRONMENT: string = config.ENVIRONMENT;
const callbackURL: string | undefined = config.callbackURL;
const callbackURLDev: string | undefined = config.callbackURLDev;

export function getCookieDomain(req: Request): string | undefined {
    const host = req.get("host");
    if (!host) return undefined;

    const domain = host.split(":")[0];

    // Browsers reject Domain=.localhost, so local cookies must be host-only.
    if (
        domain === "localhost" ||
        domain.endsWith(DOMAIN_CONSTANTS.LOCAL_LOCALHOST)
    ) {
        return undefined;
    }

    // For nip.io development (e.g. 172.27.16.1.nip.io)
    if (domain.endsWith(DOMAIN_CONSTANTS.LOCAL_NIPIO)) {
        const parts = domain.split(".");
        // nip.io with IP: [a,b,c,d,nip,io] -> 6 parts
        // We want the last 6 parts to cover any subdomain of that IP nip.io address
        if (parts.length >= DOMAIN_CONSTANTS.NIPIO_PARTS) {
            return `.${parts.slice(-DOMAIN_CONSTANTS.NIPIO_PARTS).join(".")}`;
        }
        return DOMAIN_CONSTANTS.LOCAL_NIPIO;
    }

    // For production - can be configured or derived
    // If we have a main domain like neuntra.ec, we might want .neuntra.ec
    if (production && !domain.includes("localhost") && domain.includes(".")) {
        const parts = domain.split(".");
        if (parts.length >= 2) {
            return `.${parts.slice(-2).join(".")}`;
        }
    }

    return undefined;
}

export function cookieOptions(req: Request): CookieOptions {
    const domain = getCookieDomain(req);
    const inProduction = production || isProduction(ENVIRONMENT);

    const options: CookieOptions = {
        httpOnly: inProduction,
        secure: inProduction,
        sameSite: inProduction ? "none" : "lax",
    };

    if (domain) {
        options.domain = domain;
    }

    return options;
}

export function authResponse(
    req: Request,
    res: Response,
    result: AuthResult,
    statusCode: number,
) {
    const code =
        result && typeof result.code === "number" ? result.code : statusCode;

    if (result?.success) {
        const opts = Object.assign({}, cookieOptions(req), {
            expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
        });

        // Extract token from result data
        let token: string | undefined;
        let data: unknown = result.data;

        if (result.token) {
            token = result.token;
        } else if (result.data && typeof result.data.token === "string") {
            token = result.data.token;
            // Clean up token from data if it exists there to avoid redundancy
            const { token: _, ...rest } = result.data;
            data = Object.keys(rest).length ? rest : undefined;
            // Unwrap user object if it's the only thing left
            if (isRecord(data) && data.user && Object.keys(data).length === 1) {
                data = data.user;
            }
        }

        if (token) {
            res.cookie(AUTH_CONSTANTS.COOKIE_NAME, token, opts);
        }

        return res.apiSuccess(data, result.message, code);
    }

    return res.apiError(
        result.errors || result.message || result,
        result.message || "Error",
        code,
    );
}

export function providerResponse(
    req: Request,
    res: Response,
    result: AuthResult,
    statusCode: number,
) {
    const code =
        result && typeof result.code === "number" ? result.code : statusCode;

    let token: string | undefined;
    if (result?.token) token = result.token;
    else if (result?.data && typeof result.data.token === "string")
        token = result.data.token;
    else if (
        result?.data &&
        isRecord(result.data.data) &&
        typeof result.data.data.token === "string"
    )
        token = result.data.data.token;

    if (result?.success) {
        const opts = Object.assign({}, cookieOptions(req), {
            expires: new Date(Date.now() + AUTH_CONSTANTS.COOKIE_EXPIRES_MS),
        });

        const redirectTo = isProduction(ENVIRONMENT)
            ? callbackURL || "https://neutra.ec"
            : callbackURLDev || "http://localhost:3000";

        if (token) {
            res.cookie(AUTH_CONSTANTS.COOKIE_NAME, token, opts);
        }

        return res.redirect(redirectTo);
    }

    return res.apiError(
        result.errors || result.message || result,
        result.message || "Error",
        code,
    );
}

export function deleteCookie(req: Request, res: Response) {
    return res
        .cookie(
            AUTH_CONSTANTS.COOKIE_NAME,
            "",
            Object.assign({}, cookieOptions(req), {
                expires: new Date(),
            }),
        )
        .apiSuccess(undefined, "Se ha cerrado sesión correctamente", 200);
}

export default { authResponse, deleteCookie, providerResponse };
