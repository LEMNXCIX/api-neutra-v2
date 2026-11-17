import type { Request } from "express";
import { currentUser, tenantIdOf } from "@/helpers/request-context.helpers";
import type { AuthenticatedUser } from "@/types/rbac";

const USER = { id: "user-1" } as AuthenticatedUser;

describe("request context helpers", () => {
    test("tenantIdOf returns the tenant set by the middleware", () => {
        expect(tenantIdOf({ tenantId: "tenant-1" } as Request)).toBe(
            "tenant-1",
        );
    });

    test("tenantIdOf allows the SUPER_ADMIN cross-tenant marker", () => {
        expect(tenantIdOf({ tenantId: "all" } as Request)).toBe("all");
    });

    test.each([undefined, "", "   "])(
        "tenantIdOf throws 400 TENANT_REQUIRED for %p",
        (tenantId) => {
            expect.assertions(2);
            try {
                tenantIdOf({ tenantId } as Request);
            } catch (error) {
                expect(error).toMatchObject({
                    statusCode: 400,
                    code: "TENANT_REQUIRED",
                });
                expect((error as Error).message).toMatch(/tenant/i);
            }
        },
    );

    test("currentUser returns the user set by authenticate", () => {
        expect(currentUser({ user: USER } as Request)).toBe(USER);
    });

    test("currentUser throws 401 AUTH_UNAUTHORIZED when missing", () => {
        expect.assertions(2);
        try {
            currentUser({} as Request);
        } catch (error) {
            expect(error).toMatchObject({
                statusCode: 401,
                code: "AUTH_UNAUTHORIZED",
            });
            expect((error as Error).message).toMatch(/auth/i);
        }
    });
});
