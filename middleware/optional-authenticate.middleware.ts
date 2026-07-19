import jwt from "jsonwebtoken";
import config from "@/config/index.config";
import { Request, Response, NextFunction } from "express";
import { JWTPayload, AuthenticatedUser } from "@/types/rbac";
import { RedisProvider } from "@/infrastructure/providers/redis.provider";
import { Container } from "@/infrastructure/config/container";
import { info } from "@/helpers/logger.helpers";
import {
    ROLE_CONSTANTS,
    TENANT_CONSTANTS,
} from "@/core/domain/constants";

export async function optionalAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    let token = req.cookies.token;

    if (
        !token &&
        req.headers.authorization &&
        req.headers.authorization.startsWith("Bearer ")
    ) {
        token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(
            token,
            config.jwtSecret as string,
        ) as JWTPayload;
        const redis = RedisProvider.getInstance();

        const tenantId =
            req.tenantId ||
            (req.headers["x-tenant-id"] as string) ||
            decoded.tenantId;
        const tenantSlug =
            req.tenant?.slug || (req.headers["x-tenant-slug"] as string);

        const cacheKey = `user:permissions:${decoded.id}:${tenantId || "global"}`;
        const cachedPermissions = await redis.get(cacheKey);
        let permissions: string[] = [];

        if (cachedPermissions) {
            permissions = JSON.parse(cachedPermissions);
        } else {
            const userRepository = Container.getUserRepository();
            const user = await userRepository.findById(decoded.id, {
                includeRole: true,
                includePermissions: true,
            });

            if (user && user.active) {
                let userTenant = user.tenants?.find(
                    (ut) =>
                        ut.tenantId === tenantId ||
                        (tenantSlug && ut.tenant?.slug === tenantSlug),
                );

                const globalSuperAdmin = user.tenants?.find(
                    (ut) =>
                        ut.tenant?.slug === TENANT_CONSTANTS.SUPERADMIN_SLUG &&
                        ut.role?.name === ROLE_CONSTANTS.SUPER_ADMIN,
                );

                if (!userTenant && globalSuperAdmin) {
                    userTenant = globalSuperAdmin;
                }

                if (userTenant && userTenant.role) {
                    permissions =
                        userTenant.role.permissions?.map((p) => p.name) ?? [];

                    decoded.role = {
                        id: userTenant.role.id,
                        name: userTenant.role.name,
                        level: userTenant.role.level,
                    };

                    if (tenantId) {
                        await redis.set(
                            `user:permissions:${decoded.id}:${tenantId}`,
                            JSON.stringify(permissions),
                            3600,
                        );
                    }
                }
            }
        }

        const authenticatedUser: AuthenticatedUser = {
            ...decoded,
            role: {
                ...decoded.role,
                permissions,
            },
        };

        req.user = authenticatedUser;
        next();
    } catch (error: any) {
        info(
            `[OptionalAuthenticate] Invalid token: ${error.message}. Proceeding as guest.`,
        );
        next();
    }
}
