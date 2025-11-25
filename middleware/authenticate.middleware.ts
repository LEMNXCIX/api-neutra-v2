import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { Request, Response, NextFunction } from 'express';
import { JWTPayload, AuthenticatedUser } from '@/types/rbac';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';
import { PrismaUserRepository } from '@/infrastructure/database/prisma/user.prisma-repository';

/**
 * Middleware to authenticate user via JWT token
 * Validates the token and populates req.user with decoded payload + permissions from Redis
 */
export async function authenticate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required',
            errors: [{
                code: 'AUTH_001',
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
            // Fallback: Fetch from DB if not in Redis (e.g. after cache flush)
            const userRepository = new PrismaUserRepository();
            const user = await userRepository.findById(decoded.id);

            if (user && user.role) {
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
                code: 'AUTH_004',
                message: error.message,
                type: error.name
            }]
        });
    }
}
