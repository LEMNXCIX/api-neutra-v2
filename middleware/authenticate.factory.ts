import { Request, Response, NextFunction } from "express";
import {
    AuthErrorCodes,
    httpStatusFromDomainError,
} from "@/types/error-codes";
import { ResolveAuthenticatedUserUseCase } from "@/core/application/auth/resolve-authenticated-user.use-case";
import { DomainError } from "@/core/domain/errors/domain-errors";
import { extractAuthToken } from "@/helpers/auth-token.helpers";

export function createAuthenticateMiddleware(deps: {
    resolveUser: ResolveAuthenticatedUserUseCase;
    /**
     * Defaults to true. Set false only for a route whose purpose is to grant
     * the tenant membership that a true value would refuse, which today means
     * the join-tenant route and nothing else. It is a constructor argument
     * rather than a per-request flag precisely so it cannot be switched on by a
     * caller, a query parameter or a header.
     */
    requireTenantMembership?: boolean;
}) {
    const requireTenantMembership = deps.requireTenantMembership !== false;
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = extractAuthToken(req);
        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication required",
                errors: [
                    {
                        code: AuthErrorCodes.MISSING_TOKEN,
                        message: "Token is required for this operation",
                    },
                ],
            });
        }

        try {
            const { user } = await deps.resolveUser.execute({
                token,
                tenantId: req.tenantId,
                tenantSlug: req.tenant?.slug,
                requireTenantMembership,
            });
            req.user = user;
            next();
        } catch (error) {
            if (error instanceof DomainError) {
                const statusCode = httpStatusFromDomainError(error);
                return res.status(statusCode).json({
                    success: false,
                    message: error.message,
                    errors: [
                        {
                            code: error.code,
                            message: error.message,
                        },
                    ],
                });
            }
            return res.status(403).json({
                success: false,
                message: "Invalid or expired token",
                errors: [
                    {
                        code: AuthErrorCodes.INVALID_TOKEN,
                        message:
                            error instanceof Error
                                ? error.message
                                : "Unknown error",
                    },
                ],
            });
        }
    };
}
