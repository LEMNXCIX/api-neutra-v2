import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/config/db.config';
import { ErrorCodes } from '@/types/error-codes';

// Extend Express Request to include tenant context
declare global {
    namespace Express {
        interface Request {
            tenantId?: string;
            tenant?: {
                id: string;
                name: string;
                slug: string;
                type: string;
                active: boolean;
            };
        }
    }
}

/**
 * Tenant Middleware
 * Extracts tenant identifier from request and injects tenant context
 */
export const tenantMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const nodeEnv = process.env.NODE_ENV || 'development';
        const normalizedPath = req.originalUrl.split('?')[0];

        // 1. Skip tenant validation for non-API routes (root, reference, etc.)
        if (!normalizedPath.startsWith('/api')) {
            return next();
        }

        let tenantId: string | undefined;
        let tenantSlug: string | undefined;

        // 2. Extract tenant identifier from headers
        const headerTenantId = req.headers['x-tenant-id'] as string;
        const headerTenantSlug = req.headers['x-tenant-slug'] as string;

        if (headerTenantId) tenantId = headerTenantId;
        if (headerTenantSlug) tenantSlug = headerTenantSlug;

        // 3. Extract from cookies if not in headers
        if (!tenantId && !tenantSlug) {
            const cookieHeader = req.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc: any, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});

                if (cookies['tenant-id']) tenantId = cookies['tenant-id'];
                if (cookies['tenant-slug']) tenantSlug = cookies['tenant-slug'];
            }
        }

        // 4. Extract from subdomain if still not found
        if (!tenantId && !tenantSlug) {
            const host = req.headers.host || '';
            const subdomain = extractSubdomain(host);
            if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
                tenantSlug = subdomain;
            }
        }

        const isManagementRoute =
            normalizedPath.startsWith('/api/users') ||
            normalizedPath.startsWith('/api/roles') ||
            normalizedPath.startsWith('/api/permissions') ||
            normalizedPath.startsWith('/api/tenants') ||
            normalizedPath.startsWith('/api/admin/stats') ||
            normalizedPath.startsWith('/api/auth/login') ||
            normalizedPath.startsWith('/api/auth/signup') ||
            normalizedPath.startsWith('/api/auth/forgot-password') ||
            normalizedPath.startsWith('/api/auth/reset-password') ||
            normalizedPath.startsWith('/api/auth/validate');

        // 5. Fallback for management or development
        if (!tenantId && !tenantSlug) {
            if (isManagementRoute || nodeEnv === 'development') {
                tenantSlug = 'superadmin';
            }
        }

        // **TEST MODE BYPASS**: Skip database validation in test environment
        if (nodeEnv === 'test') {
            req.tenantId = tenantId || 'default-tenant-id';
            req.tenant = {
                id: req.tenantId,
                name: 'Test Tenant',
                slug: tenantSlug || 'default',
                type: 'STORE',
                active: true,
            };
            return next();
        }

        // 6. Fetch tenant from database if not in test mode
        let tenant;
        if (tenantSlug) {
            tenant = await prisma.tenant.findUnique({
                where: { slug: tenantSlug },
                select: { id: true, name: true, slug: true, type: true, active: true },
            });
        } else if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { id: true, name: true, slug: true, type: true, active: true },
            });
        }

        // 7. Validate tenant exists and is active
        if (!tenant) {
            if (isManagementRoute) {
                return next();
            }

            res.status(404).json({
                success: false,
                statusCode: 404,
                message: 'Tenant not found',
                errors: [{ code: ErrorCodes.TENANT_NOT_FOUND, message: 'Tenant not found' }]
            });
            return;
        }

        if (!tenant.active) {
            res.status(403).json({
                success: false,
                statusCode: 403,
                message: 'Tenant is inactive. Please contact support.',
                errors: [{ code: ErrorCodes.TENANT_INACTIVE, message: 'Tenant is inactive.' }]
            });
            return;
        }

        // 8. Inject tenant context into request
        req.tenantId = tenant.id;
        req.tenant = tenant;

        next();
    } catch (error) {
        console.error('Tenant middleware error:', error);
        res.status(500).json({
            success: false,
            statusCode: 500,
            message: 'Failed to resolve tenant',
            errors: [{ code: ErrorCodes.INTERNAL_SERVER_ERROR, message: 'Internal Server Error' }]
        });
    }
};

function extractSubdomain(host: string): string | null {
    const parts = host.split('.');
    if (parts.length < 2 || /^\d+\.\d+/.test(host)) return null;
    if (host.includes('localhost')) {
        const hostname = host.split(':')[0];
        const hParts = hostname.split('.');
        if (hParts.length > 1 && hParts[hParts.length - 1] === 'localhost') return hParts[0];
        return null;
    }
    if (parts.length >= 3) return parts[0];
    return null;
}
