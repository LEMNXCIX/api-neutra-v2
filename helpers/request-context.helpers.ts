import type { Request } from "express";
import { AppError } from "@/types/api-response";
import { AuthErrorCodes, TenantErrorCodes } from "@/types/error-codes";
import type { AuthenticatedUser } from "@/types/rbac";

/**
 * Reads the tenant id placed on the request by `tenantMiddleware`.
 *
 * The `"all"` marker is valid here: SUPER_ADMIN list endpoints rely on it.
 * Callers that need a concrete tenant apply `requireConcreteTenantContext`
 * in their route instead.
 */
export function tenantIdOf(req: Request): string {
    const tenantId = req.tenantId;
    if (typeof tenantId !== "string" || tenantId.trim().length === 0) {
        throw new AppError(
            "Tenant context is required",
            400,
            TenantErrorCodes.TENANT_REQUIRED,
        );
    }
    return tenantId;
}

/** Reads the user placed on the request by the authenticate middleware. */
export function currentUser(req: Request): AuthenticatedUser {
    const user = req.user;
    if (!user) {
        throw new AppError(
            "Authentication is required",
            401,
            AuthErrorCodes.UNAUTHORIZED,
        );
    }
    return user;
}
