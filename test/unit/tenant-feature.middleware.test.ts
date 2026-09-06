import { requireTenantFeature, requireTenantType } from "@/middleware/tenant-feature.middleware";
import type { Request, Response, NextFunction } from "express";

import { Container } from "@/infrastructure/config/container";

// Override the static factory instead of mocking the module: bun's jest.mock
// hoisting does not support outer-scope references.
const getFeatureStatus = jest.fn();
const originalGetFeatureRepository = Container.getFeatureRepository;
beforeEach(() => {
    (Container as { getFeatureRepository: unknown }).getFeatureRepository =
        jest.fn().mockReturnValue({ getTenantFeatureStatus: getFeatureStatus });
});
afterAll(() => {
    (Container as { getFeatureRepository: unknown }).getFeatureRepository =
        originalGetFeatureRepository;
});

function createRes() {
    const res: Partial<Response> & { statusCode?: number; body?: unknown } = {};
    res.status = jest.fn((code: number) => {
        res.statusCode = code;
        return res as Response;
    });
    res.json = jest.fn((body: unknown) => {
        res.body = body;
        return res as Response;
    });
    return res as Response;
}

function mockReq(opts: {
    user?: unknown;
    tenantId?: string;
    tenantType?: string;
}): Request {
    return {
        user: opts.user,
        tenantId: opts.tenantId,
        tenant: opts.tenantType ? { type: opts.tenantType } : undefined,
    } as unknown as Request;
}

const superAdmin = { role: { name: "SUPER_ADMIN" } };
const regularAdmin = { role: { name: "ADMIN" } };

beforeEach(() => {
    jest.clearAllMocks();
    (Container as { getFeatureRepository: unknown }).getFeatureRepository =
        jest.fn().mockReturnValue({ getTenantFeatureStatus: getFeatureStatus });
});

describe("requireTenantFeature", () => {
    test("passes when the feature is enabled", async () => {
        getFeatureStatus.mockResolvedValue({ COUPONS: true });
        const next = jest.fn() as NextFunction;
        await requireTenantFeature("COUPONS")(
            mockReq({ user: regularAdmin, tenantId: "t1" }),
            createRes(),
            next,
        );
        expect(next).toHaveBeenCalled();
    });

    test("403 when the feature is disabled", async () => {
        getFeatureStatus.mockResolvedValue({ COUPONS: false });
        const res = createRes();
        const next = jest.fn() as NextFunction;
        await requireTenantFeature("COUPONS")(
            mockReq({ user: regularAdmin, tenantId: "t1" }),
            res,
            next,
        );
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("403 when the tenant has no feature rows", async () => {
        getFeatureStatus.mockResolvedValue({});
        const res = createRes();
        const next = jest.fn() as NextFunction;
        await requireTenantFeature("COUPONS")(
            mockReq({ user: regularAdmin, tenantId: "t1" }),
            res,
            next,
        );
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("superadmin bypasses", async () => {
        const next = jest.fn() as NextFunction;
        await requireTenantFeature("COUPONS")(
            mockReq({ user: superAdmin, tenantId: "t1" }),
            createRes(),
            next,
        );
        expect(getFeatureStatus).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    test("400 without tenant context", async () => {
        const res = createRes();
        const next = jest.fn() as NextFunction;
        await requireTenantFeature("COUPONS")(
            mockReq({ user: regularAdmin }),
            res,
            next,
        );
        expect(res.status).toHaveBeenCalledWith(400);
    });
});

describe("requireTenantType", () => {
    test("passes for allowed type", () => {
        const next = jest.fn() as NextFunction;
        requireTenantType("BOOKING", "HYBRID")(
            mockReq({ user: regularAdmin, tenantType: "BOOKING" }),
            createRes(),
            next,
        );
        expect(next).toHaveBeenCalled();
    });

    test("403 for disallowed type (BOOKING cannot operate orders)", () => {
        const res = createRes();
        const next = jest.fn() as NextFunction;
        requireTenantType("STORE", "HYBRID")(
            mockReq({ user: regularAdmin, tenantType: "BOOKING" }),
            res,
            next,
        );
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("HYBRID passes both gates", () => {
        const next = jest.fn() as NextFunction;
        requireTenantType("STORE", "HYBRID")(
            mockReq({ user: regularAdmin, tenantType: "HYBRID" }),
            createRes(),
            next,
        );
        expect(next).toHaveBeenCalled();
    });

    test("403 without tenant context", () => {
        const res = createRes();
        const next = jest.fn() as NextFunction;
        requireTenantType("STORE", "HYBRID")(
            mockReq({ user: regularAdmin }),
            res,
            next,
        );
        expect(res.status).toHaveBeenCalledWith(403);
    });

    test("superadmin bypasses", () => {
        const next = jest.fn() as NextFunction;
        requireTenantType("STORE", "HYBRID")(
            mockReq({ user: superAdmin, tenantType: "BOOKING" }),
            createRes(),
            next,
        );
        expect(next).toHaveBeenCalled();
    });
});
