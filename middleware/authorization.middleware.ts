import { Request, Response, NextFunction } from 'express';
import { AuthenticatedUser } from '@/types/rbac';

/**
 * Check if user has a specific permission
 * @param permission - Permission string in format "resource:action" (e.g., "users:read")
 */
export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user || !user.role || !user.role.permissions) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                errors: [{
                    code: 'AUTH_001',
                    message: 'You must be logged in to access this resource'
                }]
            });
        }

        const hasPermission = user.role.permissions.includes(permission);

        if (!hasPermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                errors: [{
                    code: 'AUTH_002',
                    message: `You need '${permission}' permission to access this resource`,
                    details: {
                        required: permission,
                        userPermissions: user.role.permissions
                    }
                }]
            });
        }

        next();
    };
}

/**
 * Check if user has at least one of the required permissions
 * @param permissions - Array of permission strings
 */
export function requireAnyPermission(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user || !user.role || !user.role.permissions) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                errors: [{
                    code: 'AUTH_001',
                    message: 'You must be logged in'
                }]
            });
        }

        const hasAnyPermission = permissions.some(p => user.role.permissions.includes(p));

        if (!hasAnyPermission) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                errors: [{
                    code: 'AUTH_002',
                    message: `You need at least one of these permissions: ${permissions.join(', ')}`,
                    details: {
                        required: permissions,
                        userPermissions: user.role.permissions
                    }
                }]
            });
        }

        next();
    };
}

/**
 * Check if user has all required permissions
 * @param permissions - Array of permission strings (all required)
 */
export function requireAllPermissions(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user || !user.role || !user.role.permissions) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                errors: [{
                    code: 'AUTH_001',
                    message: 'You must be logged in'
                }]
            });
        }

        const hasAllPermissions = permissions.every(p => user.role.permissions.includes(p));

        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(p => !user.role.permissions.includes(p));

            return res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                errors: [{
                    code: 'AUTH_002',
                    message: `You are missing required permissions: ${missingPermissions.join(', ')}`,
                    details: {
                        required: permissions,
                        missing: missingPermissions,
                        userPermissions: user.role.permissions
                    }
                }]
            });
        }

        next();
    };
}

/**
 * Check if user has minimum role level (backward compatibility)
 * @param minLevel - Minimum role level required
 */
export function requireRole(minLevel: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user || !user.role) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                errors: [{
                    code: 'AUTH_001',
                    message: 'You must be logged in'
                }]
            });
        }

        if (user.role.level < minLevel) {
            return res.status(403).json({
                success: false,
                message: 'Insufficient role level',
                errors: [{
                    code: 'AUTH_002',
                    message: `You need role level ${minLevel} or higher (current: ${user.role.level})`,
                    details: {
                        required: minLevel,
                        current: user.role.level,
                        roleName: user.role.name
                    }
                }]
            });
        }

        next();
    };
}

/**
 * Check if user owns the resource (for self-service operations)
 * Uses a callback to determine ownership
 */
export function requireOwnership(getResourceOwnerId: (req: Request) => Promise<string | null>) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required',
                errors: [{
                    code: 'AUTH_001',
                    message: 'You must be logged in'
                }]
            });
        }

        try {
            const ownerId = await getResourceOwnerId(req);

            if (ownerId !== user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied',
                    errors: [{
                        code: 'AUTH_003',
                        message: 'You can only access your own resources'
                    }]
                });
            }

            next();
        } catch (error) {
            return res.status(500).json({
                success: false,
                message: 'Error verifying ownership',
                errors: [{
                    code: 'SYS_001',
                    message: 'Failed to verify resource ownership'
                }]
            });
        }
    };
}
