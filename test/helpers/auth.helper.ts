import jwt from 'jsonwebtoken';
import config from '@/config/index.config';
import { JWTPayload } from '@/types/rbac';
import { RedisProvider } from '@/infrastructure/providers/redis.provider';

export const getAuthToken = async (
    userId: string = 'test-user-id',
    role: string = 'ADMIN',
    permissions: string[] = [
        'products:read', 'products:write', 'products:delete',
        'users:read', 'users:write',
        'cart:read', 'cart:write',
        'orders:read', 'orders:write',
        'slides:read', 'slides:write', 'slides:delete',
        'stats:read'
    ]
): Promise<string> => {
    const payload: JWTPayload = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
        role: {
            id: 'test-role-id',
            name: role,
            level: 10
        }
    };

    // Set permissions in Redis as the middleware expects
    const redis = RedisProvider.getInstance();
    const tenantId = 'test-tenant-id'; // Matching default tenant ID used in tests
    await redis.set(`user:permissions:${userId}:${tenantId}`, JSON.stringify(permissions), 3600);

    return jwt.sign(payload, config.jwtSecret || 'test_secret', {
        expiresIn: '1h'
    });
};
