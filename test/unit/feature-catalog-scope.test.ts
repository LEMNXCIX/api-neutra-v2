/**
 * `model Feature` has no `tenantId` and its `key` is globally `@unique`, so
 * `prisma.feature` is the platform catalog while tenancy lives in the
 * `TenantFeature` join table. `PrismaFeatureRepository.create/update/delete`
 * therefore wrote global rows, and `POST/PUT/DELETE /api/features` were gated
 * only on `requirePermission("features:write" | "features:delete")` — the
 * same permission a tenant operator holds for its own enablement. The catalog
 * is read by every tenant's gating through `getTenantFeatureStatus`, so one
 * tenant operator renaming a `key` or editing a `price` changed what every
 * other tenant's feature gating resolved.
 *
 * Three things are pinned here:
 *
 *  1. One shared super-admin gate, in `authorization.middleware.ts`, delegating
 *     to the domain `isSuperAdmin`. `loyalty.routes.ts` held a third local copy
 *     of that rule; a fourth copy of a security predicate is how the earlier
 *     `as any` / `isCodeLine` duplications started, so the route file now
 *     imports it and no longer defines one.
 *  2. The three catalog write routes carry the gate *alongside* the existing
 *     `requirePermission` — a conjunction, so holding the permission is no
 *     longer sufficient on its own. `GET /` stays on `features:read` alone:
 *     reading which features exist is not a mutation.
 *  3. The controller reads the legitimate fields instead of forwarding
 *     `req.body`, so the HTTP body cannot be wider than the repository's own
 *     allowlist.
 *
 * The tenant-scoped enablement path (`updateTenantFeatures`) is asserted
 * unchanged: it still upserts `TenantFeature` on the acting tenant, and the
 * catalog writes are asserted to stay global (no tenant predicate).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { NextFunction, Request, Response } from "express";

jest.mock("@/config/db.config", () => {
    const feature = {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
    };
    const tenantFeature = { findMany: jest.fn(), upsert: jest.fn() };
    return {
        prisma: {
            feature,
            tenantFeature,
            $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
        },
    };
});

import { prisma } from "@/config/db.config";
import { AuthErrorCodes, httpStatusFromDomainError } from "@/types/error-codes";
import { Success } from "@/core/utils/use-case-result";
import {
    ForbiddenError,
    UnauthorizedError,
} from "@/core/domain/errors/domain-errors";
import { requireSuperAdmin } from "@/middleware/authorization.middleware";
import { FeatureController } from "@/interface-adapters/controllers/feature.controller";
import { PrismaFeatureRepository } from "@/infrastructure/database/prisma/feature.prisma-repository";
import { Feature } from "@/core/entities/feature.entity";

/**
 * Records every call the RBAC middleware makes into the domain policy while
 * preserving the real decision, so "delegates to `isSuperAdmin`" is observable
 * at runtime rather than asserted by reading the source alone.
 */
const mockIsSuperAdminCalls: unknown[] = [];
jest.mock("@/core/domain/rbac/access-policy", () => {
    const actual = jest.requireActual<
        typeof import("@/core/domain/rbac/access-policy")
    >("@/core/domain/rbac/access-policy");
    return {
        ...actual,
        isSuperAdmin: (user: unknown) => {
            mockIsSuperAdminCalls.push(user);
            return actual.isSuperAdmin(user as never);
        },
    };
});

const ROOT = join(__dirname, "../..");
const readRepoFile = (relative: string) =>
    readFileSync(join(ROOT, relative), "utf8");

const authorizationSource = readRepoFile(
    "middleware/authorization.middleware.ts",
);
const featureRoutesSource = readRepoFile("infrastructure/routes/feature.routes.ts");
const loyaltyRoutesSource = readRepoFile("infrastructure/routes/loyalty.routes.ts");

const featureTable = prisma.feature as unknown as {
    findMany: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
};
const tenantFeatureTable = prisma.tenantFeature as unknown as {
    upsert: jest.Mock;
};
const transaction = prisma.$transaction as unknown as jest.Mock;

const SUPER_ADMIN = {
    id: "user-super",
    role: {
        id: "role-super",
        name: "SUPER_ADMIN",
        level: 10,
        permissions: [],
    },
};
const TENANT_ADMIN = {
    id: "user-tenant",
    role: {
        id: "role-admin",
        name: "ADMIN",
        level: 5,
        permissions: ["features:write", "features:delete"],
    },
};
const ROLELESS = { id: "user-norole" };

function runMiddleware(
    mw: (req: Request, res: Response, next: NextFunction) => void,
    user?: unknown,
) {
    const next = jest.fn();
    const res = {
        status: jest.fn(),
        json: jest.fn(),
        send: jest.fn(),
        end: jest.fn(),
    };
    let thrown: unknown;
    try {
        mw({ user } as unknown as Request, res as unknown as Response, next);
    } catch (error) {
        thrown = error;
    }
    return { next, res, thrown };
}

function routeBlock(source: string, method: string, path: string): string {
    const pattern = new RegExp(
        `router\\.${method}\\(\\s*"${path.replace("/", "\\/")}"([\\s\\S]*?)\\n\\s*\\);`,
    );
    const match = source.match(pattern);
    if (!match) {
        throw new Error(`route not found in source: ${method} ${path}`);
    }
    return match[1];
}

const FEATURE: Feature = {
    id: "feature-1",
    key: "COUPONS",
    name: "Coupons",
    description: "Coupon engine",
    category: "MODULE",
    price: 10,
};

describe("shared super-admin gate", () => {
    test("admits a super admin and writes no response", () => {
        const { next, res, thrown } = runMiddleware(requireSuperAdmin, SUPER_ADMIN);

        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();
    });

    test("refuses an authenticated non-super-admin through next(error)", () => {
        const { next, res, thrown } = runMiddleware(
            requireSuperAdmin,
            TENANT_ADMIN,
        );

        expect(thrown).toBeUndefined();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]).toHaveLength(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.code).toBe(AuthErrorCodes.FORBIDDEN);
        expect(httpStatusFromDomainError(error)).toBe(403);
    });

    test("refuses an authenticated user without a role through next(error)", () => {
        const { next, res, thrown } = runMiddleware(requireSuperAdmin, ROLELESS);

        expect(thrown).toBeUndefined();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
        expect(res.send).not.toHaveBeenCalled();

        expect(next).toHaveBeenCalledTimes(1);
        expect(next.mock.calls[0]).toHaveLength(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(error.code).toBe(AuthErrorCodes.UNAUTHORIZED);
        expect(httpStatusFromDomainError(error)).toBe(401);
    });

    test("refuses an unauthenticated request through next(error)", () => {
        const { next, thrown } = runMiddleware(requireSuperAdmin, undefined);

        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalledTimes(1);
        const error = next.mock.calls[0][0];
        expect(error).toBeInstanceOf(UnauthorizedError);
        expect(httpStatusFromDomainError(error)).toBe(401);
    });

    test("delegates the decision to the domain policy, not the role name", () => {
        mockIsSuperAdminCalls.length = 0;
        runMiddleware(requireSuperAdmin, SUPER_ADMIN);
        expect(mockIsSuperAdminCalls).toEqual([SUPER_ADMIN]);

        mockIsSuperAdminCalls.length = 0;
        runMiddleware(requireSuperAdmin, TENANT_ADMIN);
        expect(mockIsSuperAdminCalls).toEqual([TENANT_ADMIN]);
    });

    test("declares no inline role-name comparison of its own", () => {
        const declaration = authorizationSource.match(
            /export function requireSuperAdmin\([\s\S]*?\n}/,
        );

        expect(declaration).not.toBeNull();
        const source = declaration![0];
        expect(source).toContain("isSuperAdmin(");
        expect(source).not.toContain("ROLE_CONSTANTS");
        expect(source).not.toMatch(/role\??\.name\s*(?:!==?|===?)/);
    });
});

describe("catalog write routes carry the gate", () => {
    test.each([
        ["post", "/", "features:write", "featureController.create"],
        ["put", "/:id", "features:write", "featureController.update"],
        ["delete", "/:id", "features:delete", "featureController.delete"],
    ] as const)(
        "%s %s keeps requirePermission and adds the super-admin gate",
        (method, path, permission, handler) => {
            const block = routeBlock(featureRoutesSource, method, path);

            expect(block).toMatch(
                new RegExp(
                    `authenticate,\\s*requirePermission\\("${permission}"\\),\\s*requireSuperAdmin,\\s*(?:validateDto\\(\\w+\\),\\s*)?${handler.replace(
                        /\./g,
                        "\\.",
                    )}`,
                ),
            );
        },
    );

    test("GET / stays readable by a tenant operator on features:read alone", () => {
        const block = routeBlock(featureRoutesSource, "get", "/");

        expect(block).toMatch(/requirePermission\("features:read"\)/);
        expect(block).not.toContain("requireSuperAdmin");
    });
});

describe("loyalty routes no longer carry a private super-admin predicate", () => {
    test("imports the shared gate and defines no local copy", () => {
        expect(loyaltyRoutesSource).toMatch(
            /import \{[^}]*\brequireSuperAdmin\b[^}]*\} from "@\/middleware\/authorization\.middleware"/,
        );
        expect(loyaltyRoutesSource).not.toMatch(
            /function requireSuperAdmin\b/,
        );
        expect(loyaltyRoutesSource).not.toMatch(
            /const requireSuperAdmin\b/,
        );
    });

    test("still uses the shared gate on the cross-tenant admin route", () => {
        const block = routeBlock(loyaltyRoutesSource, "get", "/admin/tenants");

        expect(block).toMatch(
            /authenticate,\s*requireSuperAdmin,\s*loyaltyController\.getAllTenants/,
        );
    });
});

describe("controller body narrowing", () => {
    function setup() {
        const createFeatureUseCase = {
            execute: jest.fn().mockResolvedValue(Success(FEATURE, "created")),
        };
        const updateFeatureUseCase = {
            execute: jest.fn().mockResolvedValue(Success(FEATURE, "updated")),
        };
        const controller = new FeatureController(
            { execute: jest.fn().mockResolvedValue(Success([], "ok")) } as never,
            createFeatureUseCase as never,
            updateFeatureUseCase as never,
            {
                execute: jest.fn().mockResolvedValue(Success(null, "deleted")),
            } as never,
        );
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        return { controller, createFeatureUseCase, updateFeatureUseCase, res };
    }

    test("create hands the use case exactly the CreateFeatureDTO fields", async () => {
        const { controller, createFeatureUseCase, res } = setup();

        await controller.create(
            {
                body: {
                    key: "COUPONS",
                    name: "Coupons",
                    description: "Coupon engine",
                    category: "MODULE",
                    price: 10,
                    isActive: true,
                    tenantId: "tenant-victim",
                    id: "spoofed",
                },
            } as unknown as Request,
            res as unknown as Response,
        );

        expect(createFeatureUseCase.execute).toHaveBeenCalledTimes(1);
        const payload = createFeatureUseCase.execute.mock.calls[0][0];
        expect(payload).toEqual({
            key: "COUPONS",
            name: "Coupons",
            description: "Coupon engine",
            category: "MODULE",
            price: 10,
        });
        expect(payload).not.toHaveProperty("isActive");
        expect(payload).not.toHaveProperty("tenantId");
        expect(payload).not.toHaveProperty("id");
    });

    test("update hands the use case exactly the UpdateFeatureDTO fields and drops key", async () => {
        const { controller, updateFeatureUseCase, res } = setup();

        await controller.update(
            {
                params: { id: "feature-1" },
                body: {
                    name: "Coupons",
                    description: "Coupon engine",
                    category: "MODULE",
                    price: 25,
                    key: "RENAMED",
                    tenantId: "tenant-victim",
                },
            } as unknown as Request,
            res as unknown as Response,
        );

        expect(updateFeatureUseCase.execute).toHaveBeenCalledTimes(1);
        const [id, payload] = updateFeatureUseCase.execute.mock.calls[0];
        expect(id).toBe("feature-1");
        expect(payload).toEqual({
            name: "Coupons",
            description: "Coupon engine",
            category: "MODULE",
            price: 25,
        });
        expect(payload).not.toHaveProperty("key");
        expect(payload).not.toHaveProperty("tenantId");
    });
});

describe("catalog repository writes stay global; enablement stays tenant-scoped", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("updateTenantFeatures upserts TenantFeature on the acting tenant", async () => {
        featureTable.findMany.mockResolvedValue([
            { id: "feature-1", key: "COUPONS" },
        ]);
        tenantFeatureTable.upsert.mockResolvedValue({});
        const repository = new PrismaFeatureRepository();

        await repository.updateTenantFeatures("tenant-1", { COUPONS: true });

        expect(tenantFeatureTable.upsert).toHaveBeenCalledWith({
            where: {
                tenantId_featureId: {
                    tenantId: "tenant-1",
                    featureId: "feature-1",
                },
            },
            update: { enabled: true },
            create: {
                tenantId: "tenant-1",
                featureId: "feature-1",
                enabled: true,
            },
        });
        expect(transaction).toHaveBeenCalled();
    });

    test("create writes the catalog row with no tenant predicate", async () => {
        featureTable.create.mockResolvedValue(FEATURE);
        const repository = new PrismaFeatureRepository();

        await repository.create({
            key: "COUPONS",
            name: "Coupons",
            description: "Coupon engine",
            category: "MODULE",
            price: 10,
        });

        const args = featureTable.create.mock.calls[0][0];
        expect(Object.keys(args.data).sort()).toEqual([
            "category",
            "description",
            "key",
            "name",
            "price",
        ]);
        expect(args.where).toBeUndefined();
    });

    test("update and delete select the catalog row on id alone", async () => {
        featureTable.update.mockResolvedValue(FEATURE);
        featureTable.delete.mockResolvedValue(FEATURE);
        const repository = new PrismaFeatureRepository();

        await repository.update("feature-1", { name: "Coupons" });
        await repository.delete("feature-1");

        const updateArgs = featureTable.update.mock.calls[0][0];
        expect(updateArgs.where).toEqual({ id: "feature-1" });
        expect(Object.keys(updateArgs.data)).not.toContain("tenantId");

        expect(featureTable.delete.mock.calls[0][0].where).toEqual({
            id: "feature-1",
        });
    });
});
