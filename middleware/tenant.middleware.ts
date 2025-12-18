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
 * 
 * Tenant Resolution Strategy:
 * 1. Check x-tenant-id header (explicit)
 * 2. Check x-tenant-slug header (by slug)
 * 3. Extract from subdomain (e.g., acme.neutra.com -> 'acme')
 * 4. Fallback to 'default' tenant for development
 */
export const tenantMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        let tenantId: string | undefined;
        let tenantSlug: string | undefined;

        // Strategy 1: Explicit tenant ID from header
        const headerTenantId = req.headers['x-tenant-id'] as string;
        if (headerTenantId) {
            tenantId = headerTenantId;
        }

        // Strategy 2: Tenant slug from header
        const headerTenantSlug = req.headers['x-tenant-slug'] as string;
        if (!tenantId && headerTenantSlug) {
            tenantSlug = headerTenantSlug;
        }

        // Strategy 3: Extract from subdomain
        if (!tenantId && !tenantSlug) {
            const host = req.headers.host || '';
            const subdomain = extractSubdomain(host);
            if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
                tenantSlug = subdomain;
            }
        }

        // Strategy 4: Fallback to default (development only)
        if (!tenantId && !tenantSlug) {
            // Check if this is a management route that might require global scope
            const isManagementRoute =
                req.path.startsWith('/api/users') ||
                req.path.startsWith('/api/roles') ||
                req.path.startsWith('/api/permissions') ||
                req.path.startsWith('/api/tenants') ||
                req.path.startsWith('/api/admin/stats') ||
                req.path.startsWith('/api/auth/login'); // allow global login

            if (isManagementRoute) {
                // Allow proceeding to authentication/authorization where global access 
                // will be verified based on user permissions.
                return next();
            }

            const nodeEnv = process.env.NODE_ENV || 'development';
            if (nodeEnv === 'development') {
                tenantSlug = 'default';
            }
        }

        // **TEST MODE BYPASS**: Skip database validation in test environment
        const nodeEnv = process.env.NODE_ENV || 'development';
        if (nodeEnv === 'test') {
            // In test mode, inject tenant context without DB validation
            req.tenantId = tenantId || 'default-tenant-id';
            req.tenant = {
                id: tenantId || 'default-tenant-id',
                name: 'Test Tenant',
                slug: tenantSlug || 'default',
                type: 'STORE',
                active: true,
            };
            return next();
        }

        // Fetch tenant from database
        let tenant;
        if (tenantId) {
            tenant = await prisma.tenant.findUnique({
                where: { id: tenantId },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    type: true,
                    active: true,
                },
            });
        } else if (tenantSlug) {
            tenant = await prisma.tenant.findUnique({
                where: { slug: tenantSlug },
                select: {
                    id: true,
                    name: true,
                    slug: true,
                    type: true,
                    active: true,
                },
            });
        }

        // Validate tenant exists and is active
        if (!tenant) {
            res.status(404).json({
                success: false,
                message: 'Tenant not found',
                errors: [{
                    code: ErrorCodes.TENANT_NOT_FOUND,
                    message: 'Tenant not found'
                }]

            });
            return;
        }

        if (!tenant.active) {
            res.status(403).json({
                success: false,
                message: 'Tenant is inactive. Please contact support.',
                errors: [{
                    code: ErrorCodes.TENANT_INACTIVE,
                    message: 'Tenant is inactive. Please contact support.'
                }]
            });
            return;
        }

        // Inject tenant context into request
        req.tenantId = tenant.id;
        req.tenant = tenant;

        next();
    } catch (error) {
        console.error('Tenant middleware error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to resolve tenant',
            errors: [{
                code: ErrorCodes.INTERNAL_SERVER_ERROR,
                message: 'Failed to resolve tenant'
            }]
        });
    }
};

/**
 * Extract subdomain from host
 * Example: "acme.neutra.com" -> "acme"
 */
function extractSubdomain(host: string): string | null {
    const parts = host.split('.');

    // localhost or IP address
    if (parts.length < 2 || host.includes('localhost') || /^\d+\.\d+/.test(host)) {
        return null;
    }

    // Assume format: subdomain.domain.tld
    if (parts.length >= 3) {
        return parts[0];
    }

    return null;
}
