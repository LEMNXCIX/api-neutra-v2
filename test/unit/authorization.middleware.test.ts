// RBAC middlewares: pure logic, no DB
import {
    requirePermission,
    requireAnyPermission,
    requireAllPermissions,
    requireRole,
} from "@/middleware/authorization.middleware";
import type { Request, Response, NextFunction } from "express";

function mockReq(user?: unknown): Request {
    return { user } as unknown as Request;
}

function run(mw: (req: Request, res: Response, next: NextFunction) => void, user?: unknown) {
    const next = jest.fn() as NextFunction;
    let thrown: unknown;
    try {
        mw(mockReq(user), {} as Response, next);
    } catch (e) {
        thrown = e;
    }
    return { next, thrown };
}

const adminUser = {
    id: "u1",
    role: { id: "r1", name: "ADMIN", level: 5, permissions: ["products:read", "products:write"] },
};
const superAdminUser = {
    id: "u2",
    role: { id: "r0", name: "SUPER_ADMIN", level: 10, permissions: [] },
};

describe("requirePermission", () => {
    test("401 when unauthenticated", () => {
        const { next, thrown } = run(requirePermission("products:read"));
        expect(next).not.toHaveBeenCalled();
        expect((thrown as Error).message).toMatch(/logged in/i);
    });

    test("calls next with the permission", () => {
        const { next, thrown } = run(requirePermission("products:read"), adminUser);
        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    test("forbidden without the permission", () => {
        const { next, thrown } = run(requirePermission("users:delete"), adminUser);
        expect(next).not.toHaveBeenCalled();
        expect((thrown as Error).message).toMatch(/users:delete/);
    });

    test("superadmin bypasses", () => {
        const { next, thrown } = run(requirePermission("anything:at:all"), superAdminUser);
        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});

describe("requireAnyPermission / requireAllPermissions", () => {
    test("any: passes with one match", () => {
        const { next, thrown } = run(
            requireAnyPermission(["orders:read", "products:read"]),
            adminUser,
        );
        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });

    test("any: forbidden with no match", () => {
        const { next, thrown } = run(requireAnyPermission(["a:x", "b:y"]), adminUser);
        expect(next).not.toHaveBeenCalled();
        expect(thrown).toBeDefined();
    });

    test("all: forbidden when one is missing", () => {
        const { next, thrown } = run(
            requireAllPermissions(["products:read", "users:delete"]),
            adminUser,
        );
        expect(next).not.toHaveBeenCalled();
        expect(thrown).toBeDefined();
    });

    test("all: passes with all matches", () => {
        const { next, thrown } = run(
            requireAllPermissions(["products:read", "products:write"]),
            adminUser,
        );
        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});

describe("requireRole", () => {
    test("forbidden below level", () => {
        const { next, thrown } = run(requireRole(10), adminUser);
        expect(next).not.toHaveBeenCalled();
        expect(thrown).toBeDefined();
    });

    test("passes at level", () => {
        const { next, thrown } = run(requireRole(5), adminUser);
        expect(thrown).toBeUndefined();
        expect(next).toHaveBeenCalled();
    });
});
