import { Request, Response, NextFunction } from "express";
import { ResolveAuthenticatedUserUseCase } from "@/core/application/auth/resolve-authenticated-user.use-case";
import { info } from "@/helpers/logger.helpers";
import { extractAuthToken } from "@/helpers/auth-token.helpers";

export function createOptionalAuthenticateMiddleware(deps: {
    resolveUser: ResolveAuthenticatedUserUseCase;
}) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const token = extractAuthToken(req);
        if (!token) {
            return next();
        }

        try {
            const { user } = await deps.resolveUser.execute({
                token,
                tenantId: req.tenantId,
                tenantSlug: req.tenant?.slug,
            });
            req.user = user;
        } catch (error) {
            info(
                `[OptionalAuthenticate] Invalid token: ${error instanceof Error ? error.message : "Unknown"}. Proceeding as guest.`,
            );
        }

        next();
    };
}
