/**
 * Regression coverage for the cross-tenant user update hole: UpdateUserUseCase
 * accepted a tenantId, dropped it, and wrote through the global
 * `findById`/`update` pair, so `users:manage` in tenant A could rewrite the
 * name, email, password or active flag of a customer who belongs only to
 * tenant B. Mirrors the delete coverage in delete-user.use-case.test.ts.
 */
jest.mock("@/config/db.config", () => {
    const user = {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
    };
    return { prisma: { user } };
});

import { prisma } from "@/config/db.config";
import { UpdateUserUseCase } from "@/core/application/users/update-user.use-case";
import { PrismaUserRepository } from "@/infrastructure/database/prisma/user.prisma-repository";
import { User } from "@/core/entities/user.entity";
import {
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { TenantErrorCodes } from "@/types/error-codes";

const ATTACKER_TENANT = "tenant-attacker";
const VICTIM_TENANT = "tenant-victim";
const VICTIM_ID = "user-victim";
const NOW = new Date("2030-01-01T00:00:00.000Z");

const prismaUser = prisma.user as unknown as {
    findFirst: jest.Mock;
    update: jest.Mock;
    updateMany: jest.Mock;
};

/** Every field of the entity, so a test can prove the allowlist drops some. */
function fullPayload(): Partial<User> {
    return {
        id: "ignored-id",
        name: "Renamed",
        email: "renamed@example.com",
        password: "hashed-secret",
        profilePic: "https://cdn.example.com/a.png",
        phone: "+55 11 900000000",
        pushToken: "push-token",
        active: false,
        googleId: "google-oauth-id",
        facebookId: "facebook-oauth-id",
        twitterId: "twitter-oauth-id",
        githubId: "github-oauth-id",
        resetPasswordToken: "reset-token",
        resetPasswordExpires: NOW,
        createdAt: NOW,
        updatedAt: NOW,
        tenants: [],
    };
}

function memberUser(tenantIds: string[]): Partial<User> {
    return {
        id: VICTIM_ID,
        name: "Victim",
        email: "victim@example.com",
        active: true,
        tenants: tenantIds.map((tenantId) => ({
            id: `ut-${tenantId}`,
            userId: VICTIM_ID,
            tenantId,
            roleId: `role-${tenantId}`,
        })),
    };
}

/**
 * `exists: false` makes even the global lookup return null, so "no such user"
 * is indistinguishable from "not your tenant", exactly like the Prisma
 * membership predicate.
 */
function setup({
    tenantIds = [ATTACKER_TENANT],
    exists = true,
}: { tenantIds?: string[]; exists?: boolean } = {}) {
    const user = memberUser(tenantIds);

    const repository = {
        // Global, unscoped: what the auth flows legitimately need.
        findById: jest.fn().mockResolvedValue(exists ? user : null),
        update: jest.fn().mockImplementation(async (_id, data) => ({
            ...user,
            ...data,
        })),
        // Tenant-scoped: mirrors the Prisma membership predicate.
        findByIdForTenant: jest
            .fn()
            .mockImplementation(
                async (tenantId: string, id: string) =>
                    exists && id === VICTIM_ID && tenantIds.includes(tenantId)
                        ? user
                        : null,
            ),
        updateForTenant: jest
            .fn()
            .mockImplementation(
                async (tenantId: string, id: string, data: Partial<User>) => {
                    if (
                        !exists ||
                        id !== VICTIM_ID ||
                        !tenantIds.includes(tenantId)
                    ) {
                        throw new EntityNotFoundError("User", id);
                    }
                    return { ...user, ...data };
                },
            ),
    };

    return {
        useCase: new UpdateUserUseCase(repository as never),
        repository,
    };
}

describe("UpdateUserUseCase", () => {
    test("updates a member of the acting tenant, with the tenant in scope", async () => {
        const { useCase, repository } = setup();
        const data: Partial<User> = { name: "Renamed", active: false };

        const result = await useCase.execute(ATTACKER_TENANT, VICTIM_ID, data);

        expect(result.success).toBe(true);
        expect(result.data).toMatchObject({ name: "Renamed", active: false });
        expect(repository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(repository.updateForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
            data,
        );
        // The global pair must not be reachable from a tenant-acting caller.
        expect(repository.findById).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    test("updates a user who belongs to several tenants when the acting one is among them", async () => {
        const { useCase, repository } = setup({
            tenantIds: [ATTACKER_TENANT, VICTIM_TENANT],
        });

        const result = await useCase.execute(ATTACKER_TENANT, VICTIM_ID, {
            name: "Renamed",
        });

        expect(result.success).toBe(true);
        expect(repository.updateForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
            { name: "Renamed" },
        );
    });

    test("refuses a user who exists but belongs to another tenant", async () => {
        const { useCase, repository } = setup({
            tenantIds: [VICTIM_TENANT],
        });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID, { active: false }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        expect(repository.updateForTenant).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    test("refuses a user id that does not exist at all", async () => {
        const { useCase, repository } = setup({ exists: false });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID, { active: false }),
        ).rejects.toBeInstanceOf(ForbiddenError);

        expect(repository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(repository.updateForTenant).not.toHaveBeenCalled();
        expect(repository.update).not.toHaveBeenCalled();
    });

    describe("missing or cross-tenant context", () => {
        const rejected: Array<[string, string | undefined]> = [
            ["undefined", undefined],
            ["empty string", ""],
            ["whitespace only", "   "],
            ["cross-tenant all", "all"],
            ["cross-tenant ALL", "ALL"],
        ];

        test.each(rejected)(
            "rejects %s before touching the repository",
            async (_label, tenantId) => {
                const { useCase, repository } = setup();

                await expect(
                    useCase.execute(tenantId, VICTIM_ID, { active: false }),
                ).rejects.toMatchObject({
                    code: TenantErrorCodes.TENANT_REQUIRED,
                });
                await expect(
                    useCase.execute(tenantId, VICTIM_ID, { active: false }),
                ).rejects.toBeInstanceOf(ValidationError);

                expect(repository.findByIdForTenant).not.toHaveBeenCalled();
                expect(repository.findById).not.toHaveBeenCalled();
                expect(repository.updateForTenant).not.toHaveBeenCalled();
                expect(repository.update).not.toHaveBeenCalled();
            },
        );
    });
});

function userRow() {
    return {
        id: VICTIM_ID,
        name: "Renamed",
        email: "renamed@example.com",
        password: "hashed-secret",
        profilePic: null,
        phone: null,
        pushToken: null,
        active: true,
        googleId: null,
        facebookId: null,
        twitterId: null,
        githubId: null,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        createdAt: NOW,
        updatedAt: NOW,
        tenants: [
            {
                userId: VICTIM_ID,
                tenantId: ATTACKER_TENANT,
                roleId: "role-1",
            },
        ],
    };
}

function prismaSetup() {
    prismaUser.findFirst.mockReset();
    prismaUser.update.mockReset();
    prismaUser.updateMany.mockReset();
    prismaUser.findFirst.mockResolvedValue(userRow());
    prismaUser.update.mockResolvedValue(userRow());
    prismaUser.updateMany.mockResolvedValue({ count: 1 });

    return new PrismaUserRepository();
}

describe("IUserRepository update shapes", () => {
    test("keeps the global update unscoped", async () => {
        const proto = PrismaUserRepository.prototype;
        expect(proto.update).toBeInstanceOf(Function);
        // (id, data) — no tenant.
        expect(proto.update.length).toBe(2);

        const repository = prismaSetup();
        await repository.update(VICTIM_ID, { name: "Renamed" });

        const { where } = prismaUser.update.mock.calls[0][0];
        expect(where).toEqual({ id: VICTIM_ID });
        expect(where).not.toHaveProperty("tenantId");
        expect(where).not.toHaveProperty("tenants");
    });

    test("exposes the tenant-scoped variant next to it", async () => {
        const proto = PrismaUserRepository.prototype;
        expect(proto.updateForTenant).toBeInstanceOf(Function);
        // (tenantId, id, data) — tenant first, like findByIdForTenant.
        expect(proto.updateForTenant.length).toBe(3);

        const repository = prismaSetup();
        const updated = await repository.updateForTenant(ATTACKER_TENANT, VICTIM_ID, {
            name: "Renamed",
        });

        expect(prismaUser.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: VICTIM_ID,
                    tenants: { some: { tenantId: ATTACKER_TENANT } },
                },
            }),
        );
        expect(prismaUser.update).not.toHaveBeenCalled();
        expect(updated).toMatchObject({ id: VICTIM_ID, name: "Renamed" });
    });

    test("reads the scoped row back for the response", async () => {
        const repository = prismaSetup();

        await repository.updateForTenant(ATTACKER_TENANT, VICTIM_ID, {
            name: "Renamed",
        });

        expect(prismaUser.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: VICTIM_ID,
                    tenants: { some: { tenantId: ATTACKER_TENANT } },
                },
            }),
        );
    });

    test("raises instead of reporting success when the write matched no row", async () => {
        const repository = prismaSetup();
        // Membership revoked between the use case's read and this write.
        prismaUser.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            repository.updateForTenant(ATTACKER_TENANT, VICTIM_ID, {
                name: "Renamed",
            }),
        ).rejects.toBeInstanceOf(EntityNotFoundError);
        expect(prismaUser.findFirst).not.toHaveBeenCalled();
    });

    test("accepts exactly the same field set as the global update", async () => {
        const repository = prismaSetup();
        const payload = fullPayload();

        await repository.update(VICTIM_ID, payload);
        await repository.updateForTenant(ATTACKER_TENANT, VICTIM_ID, payload);

        const globalData = prismaUser.update.mock.calls[0][0].data;
        const scopedData = prismaUser.updateMany.mock.calls[0][0].data;

        expect(scopedData).toEqual(globalData);
        // Spelled out, so "both dropped everything" cannot pass.
        expect(Object.keys(scopedData).sort()).toEqual(
            [
                "active",
                "email",
                "facebookId",
                "githubId",
                "googleId",
                "name",
                "password",
                "phone",
                "profilePic",
                "pushToken",
                "resetPasswordExpires",
                "resetPasswordToken",
            ].sort(),
        );
    });
});
