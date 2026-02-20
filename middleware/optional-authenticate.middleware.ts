import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload, AuthenticatedUser } from '@/types/rbac';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';
import { info } from '@/helpers/logger.helpers';

/**
 * Middleware to optionally authenticate user via JWT token
 * If token is valid, populates req.user. If invalid or missing, proceeds without user context.
 */
export async function optionalAuthenticate(req: Request, res: Response, next: NextFunction) {
    let token = req.cookies.token;

    // Check Authorization header if no cookie
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
        // No token provided, proceed as guest
        return next();
    }

    try {
        const decoded = jwt.verify(token, config.jwtSecret as string) as JWTPayload;
        const redis = RedisProvider.getInstance();

        // Tenant context: Preferred from headers, fallback to token
        // Use req.tenantId if tenantMiddleware already ran, otherwise check headers
        const tenantId = req.tenantId || req.headers['x-tenant-id'] as string || (decoded as any).tenantId;
        const tenantSlug = req.tenant?.slug || req.headers['x-tenant-slug'] as string;

        // Try to get permissions from Redis - use tenant-aware key
        const cacheKey = `user:permissions:${decoded.id}:${tenantId || 'global'}`;
        const cachedPermissions = await redis.get(cacheKey);
        let permissions: string[] = [];

        if (cachedPermissions) {
            permissions = JSON.parse(cachedPermissions);
        } else {
            // Fallback: Fetch from DB if not in Redis
            const userRepository = new PrismaUserRepository();
            const user = await userRepository.findById(decoded.id, {
                includeRole: true,
                includePermissions: true
            });

            if (user && user.active) {
                // Resolve role for the current tenant context
                let userTenant = user.tenants?.find(ut =>
                    ut.tenantId === tenantId || (tenantSlug && ut.tenant?.slug === tenantSlug)
                );

                // Check if user has SUPER_ADMIN role in the 'superadmin' tenant
                const globalSuperAdmin = user.tenants?.find(ut =>
                    ut.tenant?.slug === 'superadmin' && ut.role?.name === 'SUPER_ADMIN'
                );

                if (!userTenant && globalSuperAdmin) {
                    userTenant = globalSuperAdmin;
                }

                if (userTenant && userTenant.role) {
                    permissions = userTenant.role.permissions.map(p => p.name);

                    // Create a pseudo-role for the request
                    decoded.role = {
                        id: userTenant.role.id,
                        name: userTenant.role.name,
                        level: userTenant.role.level
                    };

                    // Cache them again
                    if (tenantId) {
                        await redis.set(`user:permissions:${decoded.id}:${tenantId}`, JSON.stringify(permissions), 3600);
                    }
                }
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
        // Invalid token - just proceed as guest, don't error
        info(`[OptionalAuthenticate] Invalid token: ${error.message}. Proceeding as guest.`);
        next();
    }
}
