import { Request, Response, NextFunction } from "express";
import { AppError } from "@/types/api-response";
import { TenantErrorCodes } from "@/types/error-codes";
import { isSuperAdmin } from "@/core/domain/rbac/access-policy";

export function resolveSuperAdminTenant(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (isSuperAdmin(req.user)) {
        const queryTenantId = req.query.tenantId as string | undefined;
        if (queryTenantId) {
            req.tenantId = queryTenantId === "all" ? undefined : queryTenantId;
        }
    } else if (!req.tenantId) {
        throw new AppError(
            "Tenant context required. Use x-tenant-id or x-tenant-slug header.",
            400,
            TenantErrorCodes.TENANT_REQUIRED,
        );
    }

    next();
}
