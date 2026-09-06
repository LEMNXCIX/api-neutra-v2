import { Request, Response, NextFunction } from "express";
import { Container } from "@/infrastructure/config/container";
import { ROLE_CONSTANTS } from "@/core/domain/constants";

function isSuperAdmin(req: Request): boolean {
    const role = (req.user as { role?: { name?: string } } | undefined)?.role;
    return role?.name === ROLE_CONSTANTS.SUPER_ADMIN;
}

/**
 * 403 unless the current tenant has the feature enabled.
 * ponytail: one DB query per request — add a short-TTL cache in
 * updateTenantFeatures/getTenantFeatureStatus if this ever shows up
 * under load.
 */
export function requireTenantFeature(featureKey: string) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (isSuperAdmin(req)) return next();

            const tenantId = req.tenantId;
            if (!tenantId) {
                return res.status(400).json({
                    success: false,
                    statusCode: 400,
                    message: "Tenant context required",
                });
            }

            const features =
                await Container.getFeatureRepository().getTenantFeatureStatus(
                    tenantId,
                );
            if (!features[featureKey]) {
                return res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: `This feature (${featureKey}) is not enabled for your plan.`,
                    errors: [
                        {
                            code: "FEATURE_NOT_ENABLED",
                            message: `The ${featureKey} feature is not enabled for this tenant.`,
                        },
                    ],
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
}

/**
 * 403 unless the current tenant's type is one of the allowed ones.
 * Skipped for SUPER_ADMIN (operates across tenants with tenantId=all).
 */
export function requireTenantType(...allowed: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        if (isSuperAdmin(req)) return next();

        const type = req.tenant?.type as string | undefined;
        if (!type || !allowed.includes(type)) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: "This module is not available for your tenant type.",
                errors: [
                    {
                        code: "TENANT_TYPE_NOT_ALLOWED",
                        message: `Requires tenant type: ${allowed.join(" or ")}.`,
                    },
                ],
            });
        }

        next();
    };
}
