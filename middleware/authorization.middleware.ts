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

export function requirePermission(permission: string) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

        if (!user || !user.role || !user.role.permissions) {
            throw new UnauthorizedError(
                "You must be logged in to access this resource",
            );
        }

        if (isSuperAdmin(user)) {
            return next();
        }

        const hasPermission = user.role.permissions.includes(permission);

        if (!hasPermission) {
            throw new ForbiddenError(
                `You need '${permission}' permission to access this resource`,
            );
        }

        next();
    };
}

export function requireAnyPermission(permissions: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

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
        const user = req.user as unknown as AuthenticatedUser;

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

export function requireRole(minLevel: number) {
    return (req: Request, res: Response, next: NextFunction) => {
        const user = req.user as unknown as AuthenticatedUser;

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
        const user = req.user as unknown as AuthenticatedUser;

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
