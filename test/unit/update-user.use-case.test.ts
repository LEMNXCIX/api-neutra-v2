/**
 * Regression coverage for two holes on the same endpoint.
 *
 * The first is the cross-tenant one: UpdateUserUseCase accepted a tenantId,
 * dropped it, and wrote through the global `findById`/`update` pair, so
 * `users:manage` in tenant A could rewrite the name, email, password or active
 * flag of a customer who belongs only to tenant B. Mirrors the delete coverage
 * in delete-user.use-case.test.ts.
 *
 * The second is an account takeover that survived that fix, because the
 * tenant-scoped write inherited the global allowlist's twelve columns.
 * `PUT /api/users/:id` has no `validateDto`, so `req.body` reached the use case
 * verbatim: `{"googleId": "<attacker's own google sub>"}` was written to the
 * victim, and `findByProvider` resolves `googleId` with no tenant in the
 * predicate, so the attacker's next Google login minted a token for the
 * victim's account. `facebookId`/`githubId` reach the same global lookup, and
 * `resetPasswordToken`/`resetPasswordExpires` reach the equally global
 * `findByResetToken`, so the reset endpoint took the account without ever
 * touching the victim's email. `password` was a fifth: written through as
 * given, unhashcd, by the repository.
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
import {
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { User } from "@/core/entities/user.entity";
import { Success } from "@/core/utils/use-case-result";
import { PrismaUserRepository } from "@/infrastructure/database/prisma/user.prisma-repository";
import { UserController } from "@/interface-adapters/controllers/user.controller";
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
}: {
    tenantIds?: string[];
    exists?: boolean;
} = {}) {
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
            .mockImplementation(async (tenantId: string, id: string) =>
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
        const updated = await repository.updateForTenant(
            ATTACKER_TENANT,
            VICTIM_ID,
            {
                name: "Renamed",
            },
        );

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

    test("keeps the global update's twelve columns for the auth flows", async () => {
        const repository = prismaSetup();

        await repository.update(VICTIM_ID, fullPayload());

        // Spelled out, so "the global path dropped everything" cannot pass.
        // social-login writes the dynamic provider field and profilePic,
        // forgot-password writes the two reset columns, reset-password writes
        // password plus the two reset columns cleared to undefined.
        expect(
            Object.keys(prismaUser.update.mock.calls[0][0].data).sort(),
        ).toEqual(
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

    test("narrows the tenant-scoped update to the six admin-safe columns", async () => {
        const repository = prismaSetup();

        await repository.updateForTenant(
            ATTACKER_TENANT,
            VICTIM_ID,
            fullPayload(),
        );

        // Spelled out, so "the scoped path dropped everything" cannot pass.
        expect(
            Object.keys(prismaUser.updateMany.mock.calls[0][0].data).sort(),
        ).toEqual(
            [
                "active",
                "email",
                "name",
                "phone",
                "profilePic",
                "pushToken",
            ].sort(),
        );
    });
});

/** The six columns a tenant admin may write, in the DTO's order. */
const SAFE_FIELDS = {
    name: "Renamed",
    email: "renamed@example.com",
    profilePic: "https://cdn.example.com/a.png",
    phone: "+55 11 900000000",
    pushToken: "push-token",
    active: false,
} as const;

/**
 * The account-takeover columns. Each is writable through the global path and
 * each is the key a global, tenant-free lookup resolves: `findByProvider` for
 * the provider ids, `findByResetToken` for the reset pair. `password` is the
 * odd one out: nothing resolves it, but the repository writes it as given, so
 * a value from this endpoint lands in the column unhashcd.
 */
const TAKEOVER_FIELDS: Array<[string, string | boolean | Date]> = [
    ["googleId", "attacker-google-sub"],
    ["facebookId", "attacker-facebook-sub"],
    ["githubId", "attacker-github-sub"],
    ["resetPasswordToken", "known-reset-token"],
    ["resetPasswordExpires", new Date("2099-01-01T00:00:00.000Z")],
    ["password", "plaintext-password"],
];

function entityUser(): User {
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
        tenants: [],
    };
}

function resStub() {
    return { json: jest.fn(), status: jest.fn() };
}

/**
 * The real controller, the real use case and the real repository over a mocked
 * Prisma, so one request proves the whole chain: what the controller reads off
 * `req.body`, what the use case forwards, and what finally reaches Prisma.
 */
function takeoverChain() {
    const repository = prismaSetup();
    const useCase = new UpdateUserUseCase(repository);
    // Filler for the eight use cases this path does not touch.
    const filler = { execute: jest.fn() } as never;
    const controller = new UserController(
        filler,
        filler,
        filler,
        filler,
        filler,
        filler,
        filler,
        useCase,
        filler,
        filler,
    );
    const res = resStub();

    const put = (body: Record<string, unknown>) =>
        controller.update(
            {
                tenantId: ATTACKER_TENANT,
                params: { id: VICTIM_ID },
                body,
            } as never,
            res as never,
        );

    return { controller, useCase, repository, res, put };
}

describe("PUT /api/users/:id", () => {
    test.each(TAKEOVER_FIELDS)(
        "a body carrying %s reaches no Prisma write with that field",
        async (field, value) => {
            const { put } = takeoverChain();

            await put({ ...SAFE_FIELDS, [field]: value });

            expect(prismaUser.updateMany).toHaveBeenCalledTimes(1);
            const written = prismaUser.updateMany.mock.calls[0][0].data;
            expect(written).not.toHaveProperty(field);
            // Only the six safe fields were written, so a partial fix that
            // merely reorders or renames the leak cannot pass.
            expect(written).toEqual({ ...SAFE_FIELDS });
            // And the global, tenant-free write stays unreachable.
            expect(prismaUser.update).not.toHaveBeenCalled();
        },
    );

    test("a body carrying password never stores a plaintext password", async () => {
        const { put } = takeoverChain();

        await put({ ...SAFE_FIELDS, password: "plaintext-password" });

        expect(prismaUser.updateMany.mock.calls[0][0].data).not.toHaveProperty(
            "password",
        );
    });

    test("the six safe fields still update normally", async () => {
        const { put, res } = takeoverChain();

        await put({ ...SAFE_FIELDS });

        expect(prismaUser.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    id: VICTIM_ID,
                    tenants: { some: { tenantId: ATTACKER_TENANT } },
                },
                data: { ...SAFE_FIELDS },
            }),
        );
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true }),
        );
    });

    test("a field the admin path does not accept is silently ignored, not rejected", async () => {
        // Deliberate: the write is an allowlist, so an unknown key behaves
        // exactly like a key that never existed. A 400 here would turn a
        // request that used to answer 200 into a failure for a body the
        // client had no reason to believe was rejected, and buys no security:
        // the field still cannot be written. Pinned so it cannot drift into a
        // rejection (or into a wider allowlist) unnoticed.
        const { put, res } = takeoverChain();

        await put({ ...SAFE_FIELDS, googleId: "attacker-google-sub" });

        expect(prismaUser.updateMany.mock.calls[0][0].data).toEqual({
            ...SAFE_FIELDS,
        });
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ success: true }),
        );
    });

    test("the controller hands the use case exactly the six narrowed fields", async () => {
        // Pinned on the controller alone, so the narrowing cannot be moved
        // into the repository and disappear from the HTTP boundary.
        const execute = jest
            .fn()
            .mockResolvedValue(
                Success(entityUser(), "User updated successfully"),
            );
        const filler = { execute: jest.fn() } as never;
        const controller = new UserController(
            filler,
            filler,
            filler,
            filler,
            filler,
            filler,
            filler,
            { execute } as never,
            filler,
            filler,
        );
        const res = resStub();

        await controller.update(
            {
                tenantId: ATTACKER_TENANT,
                params: { id: VICTIM_ID },
                body: {
                    ...SAFE_FIELDS,
                    password: "plaintext-password",
                    googleId: "attacker-google-sub",
                    facebookId: "attacker-facebook-sub",
                    githubId: "attacker-github-sub",
                    resetPasswordToken: "known-reset-token",
                    resetPasswordExpires: new Date("2099-01-01T00:00:00.000Z"),
                    id: "ignored-id",
                    roleId: "ignored-role",
                },
            } as never,
            res as never,
        );

        expect(execute).toHaveBeenCalledTimes(1);
        const [tenantId, id, data] = execute.mock.calls[0];
        expect(tenantId).toBe(ATTACKER_TENANT);
        expect(id).toBe(VICTIM_ID);
        expect(Object.keys(data).sort()).toEqual(
            Object.keys(SAFE_FIELDS).sort(),
        );
        for (const forbidden of TAKEOVER_FIELDS) {
            expect(data).not.toHaveProperty(forbidden[0]);
        }
    });

    test("an absent field stays absent rather than becoming an explicit null", async () => {
        const { put } = takeoverChain();

        await put({ name: "Renamed" });

        // `undefined` is skipped by the allowlist, so a partial body writes
        // exactly one column instead of blanking the rest.
        expect(prismaUser.updateMany.mock.calls[0][0].data).toEqual({
            name: "Renamed",
        });
    });
});
