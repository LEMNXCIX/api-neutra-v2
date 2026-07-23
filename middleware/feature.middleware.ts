import { Request, Response, NextFunction } from "express";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ICacheProvider } from "@/core/providers/cache-provider.interface";
import { info } from "@/helpers/logger.helpers";
import { Container } from "@/infrastructure/config/container";

export function createRequireFeature(deps: {
    featureRepository: IFeatureRepository;
    cache: ICacheProvider;
}) {
    return (featureKey: string) => {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                const tenantId = req.tenantId;

                if (!tenantId) {
                    return res.status(400).json({
                        success: false,
                        message: "Tenant context required for feature check",
                        errors: [
                            {
                                code: "VALIDATION_ERROR",
                                message: "Tenant context missing",
                            },
                        ],
                    });
                }

                const cacheKey = `tenant:${tenantId}:features`;
                const cachedFeatures = await deps.cache.get(cacheKey);

                let enabledFeatures: string[] = [];

                if (cachedFeatures) {
                    enabledFeatures = JSON.parse(cachedFeatures);
                } else {
                    enabledFeatures =
                        await deps.featureRepository.findEnabledFeatureKeysByTenantId(
                            tenantId,
                        );

                    await deps.cache.set(
                        cacheKey,
                        JSON.stringify(enabledFeatures),
                        3600,
                    );
                }

                if (enabledFeatures.includes(featureKey)) {
                    return next();
                }

                info(
                    `[RequireFeature] Access denied. Tenant ${tenantId} missing feature ${featureKey}`,
                );

                return res.status(403).json({
                    success: false,
                    message: `Feature ${featureKey} not enabled for this tenant`,
                    errors: [
                        {
                            code: "FEATURE_DISABLED",
                            message: `This functionality requires the ${featureKey} module.`,
                        },
                    ],
                });
            } catch (error) {
                console.error("[FeatureMiddleware] Error:", error);
                return res.status(500).json({
                    success: false,
                    message: "Internal server error during feature check",
                });
            }
        };
    };
}

export const requireFeature = createRequireFeature({
    featureRepository: Container.getFeatureRepository(),
    cache: Container.getCacheProvider(),
});
