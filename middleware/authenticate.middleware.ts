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

        // Try to get permissions from Redis
        const cachedPermissions = await redis.get(`user:permissions:${decoded.id}`);
        let permissions: string[] = [];

        if (cachedPermissions) {
            permissions = JSON.parse(cachedPermissions);
        } else {
            // Fallback: Fetch from DB if not in Redis
            const userRepository = new PrismaUserRepository();
            const tenantId = (decoded as any).tenantId;

            // findById now handles optional tenantId, allowing global lookup if needed
            const user = await userRepository.findById(tenantId, decoded.id, {
                includeRole: true,
                includePermissions: true
            });

            if (user && user.role) {
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

                permissions = user.role.permissions.map(p => p.name);
                // Cache them again
                await redis.set(`user:permissions:${decoded.id}`, JSON.stringify(permissions), 3600);
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
