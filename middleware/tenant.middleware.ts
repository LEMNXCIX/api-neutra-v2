import { Request, Response, NextFunction } from "express";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ErrorCodes } from "@/types/error-codes";
import {
    TENANT_CONSTANTS,
    isDevelopment,
    isTest,
} from "@/core/domain/constants";
import { TENANT_HTTP_CONSTANTS } from "@/config/infrastructure-constants";
import { Container } from "@/infrastructure/config/container";
import config from "@/config/index.config";

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

            if (isTest(environment) || isTest(config.env)) {
                req.tenantId = tenantId || "default-tenant-id";
                req.tenant = {
                    id: req.tenantId,
                    name: "Test Tenant",
                    slug: tenantSlug || "default",
                    type: "STORE",
                    active: true,
                };
                return next();
            }

            let tenant;
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

            if (!tenant.active) {
                res.status(403).json({
                    success: false,
                    statusCode: 403,
                    message: "Tenant is inactive. Please contact support.",
                    errors: [
                        {
                            code: ErrorCodes.TENANT_INACTIVE,
                            message: "Tenant is inactive.",
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
            console.error("Tenant middleware error:", error);
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

export const tenantMiddleware = createTenantMiddleware({
    tenantRepository: Container.getTenantRepository(),
    environment: config.ENVIRONMENT,
});
