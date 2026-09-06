// Covers the anti-cross-tenant membership check (security fix)
import { ResolveAuthenticatedUserUseCase } from "@/core/application/auth/resolve-authenticated-user.use-case";
import { ForbiddenError, UnauthorizedError } from "@/core/domain/errors/domain-errors";

const TOKEN = { id: "u1", email: "a@b.com", name: "A", role: { id: "r1", name: "USER", level: 1 } };

function setup(overrides?: { user?: unknown; cached?: string | null }) {
    const tokenGenerator = { verify: jest.fn().mockReturnValue({ ...TOKEN }), generate: jest.fn() };
    const cache = {
        get: jest.fn().mockResolvedValue(overrides?.cached ?? null),
        set: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn(),
    };
    const userRepository = {
        findById: jest.fn().mockResolvedValue(overrides?.user ?? null),
    };
    const useCase = new ResolveAuthenticatedUserUseCase(
        tokenGenerator as never,
        userRepository as never,
        cache as never,
    );
    return { useCase, tokenGenerator, cache, userRepository };
}

const memberUser = {
    id: "u1",
    active: true,
    tenants: [
        {
            tenantId: "t1",
            role: { id: "r1", name: "ADMIN", level: 5, permissions: [{ name: "products:read" }] },
            tenant: { id: "t1", slug: "store1" },
        },
    ],
};

const superadminUser = {
    id: "u1",
    active: true,
    tenants: [
        {
            tenantId: "t-super",
            role: { id: "r0", name: "SUPER_ADMIN", level: 10, permissions: [] },
            tenant: { id: "t-super", slug: "superadmin" },
        },
    ],
};

describe("ResolveAuthenticatedUserUseCase", () => {
    test("resolves role and permissions for a tenant member", async () => {
        const { useCase, cache } = setup({ user: memberUser });
        const { user } = await useCase.execute({ token: "tok", tenantId: "t1" });

        expect(user.role.name).toBe("ADMIN");
        expect(user.role.permissions).toContain("products:read");
        expect(cache.set).toHaveBeenCalled();
    });

    test("rejects a non-member tenant (anti cross-tenant)", async () => {
        const { useCase } = setup({ user: memberUser });
        await expect(
            useCase.execute({ token: "tok", tenantId: "t-victim" }),
        ).rejects.toThrow(ForbiddenError);
    });

    test("rejects by slug when user is not a member", async () => {
        const { useCase } = setup({ user: memberUser });
        await expect(
            useCase.execute({ token: "tok", tenantSlug: "other-store" }),
        ).rejects.toThrow(ForbiddenError);
    });

    test("global superadmin can access any tenant", async () => {
        const { useCase } = setup({ user: superadminUser });
        const { user } = await useCase.execute({ token: "tok", tenantId: "t-any" });

        expect(user.role.name).toBe("SUPER_ADMIN");
    });

    test("serves permissions from cache without hitting the repo", async () => {
        const { useCase, userRepository, cache } = setup({
            cached: JSON.stringify(["cached:perm"]),
        });
        const { user } = await useCase.execute({ token: "tok", tenantId: "t1" });

        expect(user.role.permissions).toEqual(["cached:perm"]);
        expect(userRepository.findById).not.toHaveBeenCalled();
        expect(cache.get).toHaveBeenCalledWith("user:permissions:u1:t1");
    });

    test("rejects inactive user", async () => {
        const { useCase } = setup({ user: { ...memberUser, active: false } });
        await expect(
            useCase.execute({ token: "tok", tenantId: "t1" }),
        ).rejects.toThrow(ForbiddenError);
    });

    test("rejects unknown user", async () => {
        const { useCase } = setup({ user: null });
        await expect(
            useCase.execute({ token: "tok", tenantId: "t1" }),
        ).rejects.toThrow(UnauthorizedError);
    });
});
