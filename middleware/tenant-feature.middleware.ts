import type { NextFunction, Request, Response } from "express";
import { isSuperAdmin } from "@/core/domain/rbac/access-policy";
import {
    evaluateFeatureEnabled,
    evaluateTenantType,
} from "@/core/domain/tenant/feature-policy";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { TenantErrorCodes } from "@/types/error-codes";

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
                if (isSuperAdmin(req.user)) return next();

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
                const decision = evaluateFeatureEnabled({
                    featureKey,
                    enabled: features[featureKey],
                });
                if (!decision.allowed) {
                    return res.status(403).json({
                        success: false,
                        statusCode: 403,
                        message: `This feature (${featureKey}) is not enabled for your plan.`,
                        errors: [
                            {
                                code: decision.code,
                                message: decision.message,
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
        if (isSuperAdmin(req.user)) return next();

        const decision = evaluateTenantType({
            type: req.tenant?.type,
            allowed,
        });
        if (!decision.allowed) {
            return res.status(403).json({
                success: false,
                statusCode: 403,
                message: "This module is not available for your tenant type.",
                errors: [
                    {
                        code: decision.code,
                        message: decision.message,
                    },
                ],
            });
        }

        next();
    };
}
