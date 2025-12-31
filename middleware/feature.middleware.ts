import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db.config';
import { ErrorCodes } from '@/types/error-codes';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { info } from '@/helpers/logger.helpers';

/**
 * Middleware to check if a specific feature is enabled for the current tenant
 * @param featureKey The unique key of the feature (e.g., 'BOOKING', 'ECOMMERCE')
 */
export const requireFeature = (featureKey: string) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const tenantId = req.tenantId;

            if (!tenantId) {
                // If no tenant context, we can't check features. 
                // However, for superadmin/global context, maybe features don't apply?
                // For now, fail safe.
                return res.status(400).json({
                    success: false,
                    message: 'Tenant context required for feature check',
                    errors: [{
                        code: 'VALIDATION_ERROR',
                        message: 'Tenant context missing'
                    }]
                });
            }

            // Check cache first
            const redis = RedisProvider.getInstance();
            const cacheKey = `tenant:${tenantId}:features`;
            const cachedFeatures = await redis.get(cacheKey);

            let enabledFeatures: string[] = [];

            if (cachedFeatures) {
                enabledFeatures = JSON.parse(cachedFeatures);
            } else {
                // Fetch from DB
                // We join TenantFeature -> Feature to get the keys
                const tenantFeatures = await prisma.tenantFeature.findMany({
                    where: {
                        tenantId: tenantId,
                        enabled: true,
                        feature: {
                            // Ensure feature definition itself is effectively "active" if you had such a flag,
                            // but schema doesn't have active on Feature, only on TenantFeature.
                        }
                    },
                    include: {
                        feature: true
                    }
                });

                enabledFeatures = tenantFeatures.map(tf => tf.feature.key);

                // Cache for 1 hour
                await redis.set(cacheKey, JSON.stringify(enabledFeatures), 3600);
            }

            // Super Admin Bypass?
            // Maybe super admins can access everything, OR they are also bound by tenant features.
            // Usually, tenant limits apply even to admins managing that tenant.

            if (enabledFeatures.includes(featureKey)) {
                return next();
            }

            info(`[RequireFeature] Access denied. Tenant ${tenantId} missing feature ${featureKey}`);

            return res.status(403).json({
                success: false,
                message: `Feature ${featureKey} not enabled for this tenant`,
                errors: [{
                    code: 'FEATURE_DISABLED', // Add to ErrorCodes if strict
                    message: `This functionality requires the ${featureKey} module.`
                }]
            });

        } catch (error) {
            console.error('[FeatureMiddleware] Error:', error);
            return res.status(500).json({
                success: false,
                message: 'Internal server error during feature check'
            });
        }
    };
};
