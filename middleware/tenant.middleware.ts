import type { NextFunction, Request, Response } from "express";
import { TENANT_HTTP_CONSTANTS } from "@/config/infrastructure-constants";
import { isDevelopment, TENANT_CONSTANTS } from "@/core/domain/constants";
import { evaluateTenantActive } from "@/core/domain/tenant/feature-policy";
import type { Tenant } from "@/core/entities/tenant.entity";
import type { ILogger } from "@/core/providers/logger.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ErrorCodes } from "@/types/error-codes";

function isManagementRoute(normalizedPath: string): boolean {
    return TENANT_HTTP_CONSTANTS.MANAGEMENT_PATH_PREFIXES.some((prefix) =>
        normalizedPath.startsWith(prefix),
    );
}

function extractSubdomain(host: string): string | null {
    const parts = host.split(".");
    if (parts.length < 2 || /^\d+\.\d+/.test(host)) return null;
    if (host.includes("localhost")) {
        const hostname = host.split(":")[0];
        const hParts = hostname.split(".");
        if (hParts.length > 1 && hParts[hParts.length - 1] === "localhost")
            return hParts[0];
        return null;
    }
    if (parts.length >= 3) return parts[0];
    return null;
}

export function createTenantMiddleware(deps: {
    tenantRepository: ITenantRepository;
    environment: string;
    logger: ILogger;
}) {
    return async (
        req: Request,
        res: Response,
        next: NextFunction,
    ): Promise<void> => {
        try {
            const environment = deps.environment;
            const normalizedPath = req.originalUrl.split("?")[0];

            if (!normalizedPath.startsWith("/api")) {
                return next();
            }

            let tenantId: string | undefined;
            let tenantSlug: string | undefined;

            const headerTenantId = req.headers["x-tenant-id"] as string;
            const headerTenantSlug = req.headers["x-tenant-slug"] as string;

            if (headerTenantId) tenantId = headerTenantId;
            if (headerTenantSlug) tenantSlug = headerTenantSlug;

            if (!tenantId && !tenantSlug) {
                const cookieHeader = req.headers.cookie;
                if (cookieHeader) {
                    const cookies = cookieHeader
                        .split(";")
                        .reduce((acc: Record<string, string>, cookie) => {
                            const [key, value] = cookie.trim().split("=");
                            acc[key] = value;
                            return acc;
                        }, {});

                    if (cookies["tenant-id"]) tenantId = cookies["tenant-id"];
                    if (cookies["tenant-slug"])
                        tenantSlug = cookies["tenant-slug"];
                }
            }

            if (!tenantId && !tenantSlug) {
                const host = req.headers.host || "";
                const subdomain = extractSubdomain(host);
                if (
                    subdomain &&
                    !TENANT_HTTP_CONSTANTS.RESERVED_SUBDOMAINS.includes(
                        subdomain,
                    )
                ) {
                    tenantSlug = subdomain;
                }
            }

            if (!tenantId && !tenantSlug) {
                if (
                    isManagementRoute(normalizedPath) ||
                    isDevelopment(environment)
                ) {
                    tenantSlug = TENANT_CONSTANTS.SUPERADMIN_SLUG;
                }
            }

            // No environment-dependent shortcut: the tenant is always resolved
            // through the repository and always runs the activity check, so a
            // missing or inactive tenant behaves the same in test and in
            // production. The previous branch fabricated a hardcoded STORE
            // tenant under NODE_ENV=test before the lookup, which made a 404 and
            // an inactive tenant unreachable in tests and let a BOOKING-only
            // route pass a STORE tenant. It also read config.env directly, so
            // behaviour depended on ambient config rather than the injected
            // environment.
            let tenant: Tenant | null | undefined;
            if (tenantSlug) {
                tenant = await deps.tenantRepository.findBySlug(tenantSlug);
            } else if (tenantId) {
                tenant = await deps.tenantRepository.findById(tenantId);
            }

            if (!tenant) {
                if (isManagementRoute(normalizedPath)) {
                    return next();
                }

                res.status(404).json({
                    success: false,
                    statusCode: 404,
                    message: "Tenant not found",
                    errors: [
                        {
                            code: ErrorCodes.TENANT_NOT_FOUND,
                            message: "Tenant not found",
                        },
                    ],
                });
                return;
            }

            const activity = evaluateTenantActive({ active: tenant.active });
            if (!activity.allowed) {
                res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: "Tenant is inactive. Please contact support.",
                    errors: [
                        {
                            code: activity.code,
                            message: activity.message,
                        },
                    ],
                });
                return;
            }

            req.tenantId = tenant.id;
            req.tenant = {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                type: tenant.type,
                active: tenant.active,
            };

            next();
        } catch (error) {
            deps.logger.error("Tenant middleware error", error);
            res.status(500).json({
                success: false,
                statusCode: 500,
                message: "Failed to resolve tenant",
                errors: [
                    {
                        code: ErrorCodes.INTERNAL_SERVER_ERROR,
                        message: "Internal Server Error",
                    },
                ],
            });
        }
    };
}
