import { Request, Response, NextFunction } from "express";
import { AuthenticatedUser } from "@/types/rbac";
import {
    DomainError,
    UnauthorizedError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";
import { ROLE_CONSTANTS } from "@/core/domain/constants";

function isSuperAdmin(user: AuthenticatedUser | undefined): boolean {
    return user?.role?.name === ROLE_CONSTANTS.SUPER_ADMIN;
}

export const APPOINTMENT_OPERATIONAL_ROLES = [
    "STAFF",
    "MANAGER",
    "ADMIN",
] as const;

export function hasPermission(
    user: AuthenticatedUser | undefined,
    permission: string,
): boolean {
    if (!user?.role) return false;
    if (isSuperAdmin(user)) return true;
    return user.role.permissions?.includes(permission) ?? false;
}

export function hasAnyRole(
    user: AuthenticatedUser | undefined,
    roles: readonly string[],
): boolean {
    if (!user?.role) return false;
    return isSuperAdmin(user) || roles.includes(user.role.name);
}

export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user?.role) {
            throw new UnauthorizedError(
                "You must be logged in to access this resource",
            );
        }

        if (!hasPermission(user, permission)) {
            throw new ForbiddenError(
                `You need '${permission}' permission to access this resource`,
            );
        }

        next();
    };
}

export function requireAnyPermission(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user || !user.role || !user.role.permissions) {
            throw new UnauthorizedError("You must be logged in");
        }

        if (isSuperAdmin(user)) {
            return next();
        }

        const hasAnyPermission = permissions.some((p) =>
            user.role.permissions.includes(p),
        );

        if (!hasAnyPermission) {
            throw new ForbiddenError(
                `You need at least one of these permissions: ${permissions.join(", ")}`,
            );
        }

        next();
    };
}

export function requireAllPermissions(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user || !user.role || !user.role.permissions) {
            throw new UnauthorizedError("You must be logged in");
        }

        if (isSuperAdmin(user)) {
            return next();
        }

        const hasAllPermissions = permissions.every((p) =>
            user.role.permissions.includes(p),
        );

        if (!hasAllPermissions) {
            const missingPermissions = permissions.filter(
                (p) => !user.role.permissions.includes(p),
            );
            throw new ForbiddenError(
                `You are missing required permissions: ${missingPermissions.join(", ")}`,
            );
        }

        next();
    };
}

export function requireAnyRole(roles: readonly string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user?.role) {
            throw new UnauthorizedError("You must be logged in");
        }

        if (!hasAnyRole(user, roles)) {
            throw new ForbiddenError(
                `You need one of these roles: ${roles.join(", ")}`,
            );
        }

        next();
    };
}

export function requireRole(minLevel: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user || !user.role) {
            throw new UnauthorizedError("You must be logged in");
        }

        if (isSuperAdmin(user)) {
            return next();
        }

        if (user.role.level < minLevel) {
            throw new ForbiddenError(
                `You need role level ${minLevel} or higher (current: ${user.role.level})`,
            );
        }

        next();
    };
}

export function requireOwnership(
    getResourceOwnerId: (req: Request) => Promise<string | null>,
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        const user = req.user;

        if (!user) {
            throw new UnauthorizedError("You must be logged in");
        }

        try {
            const ownerId = await getResourceOwnerId(req);

            if (ownerId !== user.id) {
                throw new ForbiddenError(
                    "You can only access your own resources",
                );
            }

            next();
        } catch (error) {
            if (error instanceof DomainError) throw error;
            throw new ForbiddenError("Failed to verify resource ownership");
        }
    };
}
