import { Request, Response, NextFunction } from "express";
import { ResolveAuthenticatedUserUseCase } from "@/core/application/auth/resolve-authenticated-user.use-case";
import type { ILogger } from "@/core/providers/logger.interface";
import { extractAuthToken } from "@/helpers/auth-token.helpers";

export function createOptionalAuthenticateMiddleware(deps: {
    resolveUser: ResolveAuthenticatedUserUseCase;
    logger: ILogger;
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
            deps.logger.info(
                `[OptionalAuthenticate] Invalid token: ${error instanceof Error ? error.message : "Unknown"}. Proceeding as guest.`,
            );
        }

        next();
    };
}
