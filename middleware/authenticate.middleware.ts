import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload, AuthenticatedUser } from '@/types/rbac';
import { AuthErrorCodes } from '@/types/error-codes';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { info } from '@/helpers/logger.helpers';

/**
 * Middleware to authenticate user via JWT token
 * Validates the token and populates req.user with decoded payload + permissions from Redis
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    let token = req.cookies.token;

    // Check Authorization header if no cookie
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            errors: [{
                code: AuthErrorCodes.MISSING_TOKEN,
                message: 'Token is required for this operation'
            }]
        });
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret as string) as JWTPayload;
        const redis = RedisProvider.getInstance();

        // Tenant context: Preferred from headers (slug resolution usually happens before), fallback to token
        // Use req.tenantId if tenantMiddleware already ran, otherwise check headers
        const tenantId = req.tenantId || req.headers['x-tenant-id'] as string || (decoded as any).tenantId;
        const tenantSlug = req.tenant?.slug || req.headers['x-tenant-slug'] as string;

        // Try to get permissions from Redis - use tenant-aware key
        const cacheKey = `user:permissions:${decoded.id}:${tenantId || 'global'}`;
        const cachedPermissions = await redis.get(cacheKey);
        let permissions: string[] = [];

        if (cachedPermissions) {
            permissions = JSON.parse(cachedPermissions);
            info(`[Authenticate] Cache hit for ${decoded.id} in tenant ${tenantId || 'global'}: ${permissions.length} permissions`);
        } else {
            // Fallback: Fetch from DB if not in Redis
            const userRepository = new PrismaUserRepository();

            info(`[Authenticate] Cache miss for ${decoded.id} in tenant ${tenantId || 'global'}. Fetching from DB...`);

            const user = await userRepository.findById(decoded.id, {
                includeRole: true,
                includePermissions: true
            });

            if (user) {
                info(`[Authenticate] User ${decoded.id} found in DB. Tenants: ${user.tenants?.length || 0}`);
                // Check if user is active
                if (!user.active) {
                    return res.status(403).json({
                        success: false,
                        message: 'Account is inactive',
                        errors: [{
                            code: AuthErrorCodes.ACCOUNT_INACTIVE,
                            message: 'This account has been deactivated or banned'
                        }]
                    });
                }

                // Resolve role for the current tenant context
                let userTenant = user.tenants?.find(ut =>
                    ut.tenantId === tenantId || (tenantSlug && ut.tenant?.slug === tenantSlug)
                );

                if (userTenant) {
                    info(`[Authenticate] Found userTenant entry for tenant ${tenantId || tenantSlug}. Role: ${userTenant.role?.name}`);
                } else {
                    info(`[Authenticate] NO userTenant found for user ${decoded.id} in tenant ${tenantId || tenantSlug}. Total user tenants: ${user.tenants?.length}`);
                }

                // Check if user has SUPER_ADMIN role in the 'superadmin' tenant
                const globalSuperAdmin = user.tenants?.find(ut =>
                    ut.tenant?.slug === 'superadmin' && ut.role?.name === 'SUPER_ADMIN'
                );

                // If user is SUPER_ADMIN in superadmin tenant and doesn't have a role in this tenant,
                // grant all permissions
                if (!userTenant && globalSuperAdmin) {
                    info(`[Authenticate] Global SUPER_ADMIN ${decoded.id} accessing tenant ${tenantId || 'global'}`);
                    userTenant = globalSuperAdmin;
                }

                if (userTenant && userTenant.role) {
                    permissions = userTenant.role.permissions.map(p => p.name);
                    info(`[Authenticate] Resolved ${permissions.length} permissions for role ${userTenant.role.name} in context ${tenantId || tenantSlug}`);

                    // Create a pseudo-role for the request
                    decoded.role = {
                        id: userTenant.role.id,
                        name: userTenant.role.name,
                        level: userTenant.role.level
                    };

                    // Cache them again for this specific user:tenant context
                    if (tenantId) {
                        await redis.set(`user:permissions:${decoded.id}:${tenantId}`, JSON.stringify(permissions), 3600);
                    }
                } else {
                    info(`[Authenticate] No valid role found for user ${decoded.id} after checking tenant/global superadmin`);
                }
            } else {
                info(`[Authenticate] User ${decoded.id} NOT found in DB`);
            }
        }

        // Attach user info to request with permissions
        const authenticatedUser: AuthenticatedUser = {
            ...decoded,
            role: {
                ...decoded.role,
                permissions
            }
        };

        (req as any).user = authenticatedUser;

        next();
    } catch (error: any) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token',
            errors: [{
                code: AuthErrorCodes.INVALID_TOKEN,
                message: error.message,
                type: error.name
            }]
        });
    }
}
