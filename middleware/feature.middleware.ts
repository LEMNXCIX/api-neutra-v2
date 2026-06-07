import { Request, Response, NextFunction } from "express";
import { Container } from "@/infrastructure/config/container";
import { ErrorCodes } from "@/types/error-codes";
import { RedisProvider } from "@/infrastructure/providers/redis.provider";
import { info } from "@/helpers/logger.helpers";

export const requireFeature = (featureKey: string) => {
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

            const redis = RedisProvider.getInstance();
            const cacheKey = `tenant:${tenantId}:features`;
            const cachedFeatures = await redis.get(cacheKey);

            let enabledFeatures: string[] = [];

            if (cachedFeatures) {
                enabledFeatures = JSON.parse(cachedFeatures);
            } else {
                const featureRepository = Container.getFeatureRepository();
                enabledFeatures =
                    await featureRepository.findEnabledFeatureKeysByTenantId(
                        tenantId,
                    );

                await redis.set(
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
