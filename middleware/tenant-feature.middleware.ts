import { Request, Response, NextFunction } from "express";
import { ROLE_CONSTANTS } from "@/core/domain/constants";
import { TenantErrorCodes } from "@/types/error-codes";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";

function hasConcreteTenant(req: Request): boolean {
    if (typeof req.tenantId !== "string") return false;

    const tenantId = req.tenantId.trim();
    return tenantId.length > 0 && tenantId.toLowerCase() !== "all";
}

/**
 * Rejects cross-tenant (`all`) or missing tenant context for routes that
 * must always query one tenant.
 */
export function requireConcreteTenantContext(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    if (!hasConcreteTenant(req)) {
        return res.status(400).json({
            success: false,
            statusCode: 400,
            message: "A concrete tenant context is required",
            errors: [
                {
                    code: TenantErrorCodes.TENANT_REQUIRED,
                    message:
                        "Provide a concrete tenant via tenantId or x-tenant-id; 'all' is not allowed.",
                },
            ],
        });
    }

    next();
}

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
export function createRequireTenantFeature(deps: {
    featureRepository: IFeatureRepository;
}) {
    return (featureKey: string) =>
        async (req: Request, res: Response, next: NextFunction) => {
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
                    await deps.featureRepository.getTenantFeatureStatus(
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
