jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { DeleteUserUseCase } from "@/core/application/users/delete-user.use-case";
import { PrismaUserRepository } from "@/infrastructure/database/prisma/user.prisma-repository";
import {
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { TenantErrorCodes } from "@/types/error-codes";

const ATTACKER_TENANT = "tenant-attacker";
const VICTIM_TENANT = "tenant-victim";
const VICTIM_ID = "user-victim";

function memberUser(tenantIds: string[]) {
    return {
        id: VICTIM_ID,
        name: "Victim",
        email: "victim@example.com",
        active: true,
        tenants: tenantIds.map((tenantId) => ({
            userId: VICTIM_ID,
            tenantId,
            roleId: `role-${tenantId}`,
        })),
    };
}

/**
 * `exists: false` makes even the global lookup return null, so the "no such
 * user" case is indistinguishable from the "not your tenant" case.
 */
function setup({
    tenantIds = [ATTACKER_TENANT],
    exists = true,
}: { tenantIds?: string[]; exists?: boolean } = {}) {
    const user = memberUser(tenantIds);

    const repository = {
        // Global, unscoped: what the auth flows legitimately need.
        findById: jest.fn().mockResolvedValue(exists ? user : null),
        delete: jest.fn().mockResolvedValue(undefined),
        // Tenant-scoped: mirrors the Prisma membership predicate.
        findByIdForTenant: jest
            .fn()
            .mockImplementation(
                async (tenantId: string, id: string) =>
                    exists && id === VICTIM_ID && tenantIds.includes(tenantId)
                        ? user
                        : null,
            ),
        deleteForTenant: jest
            .fn()
            .mockImplementation(async (tenantId: string, id: string) => {
                if (
                    !exists ||
                    id !== VICTIM_ID ||
                    !tenantIds.includes(tenantId)
                ) {
                    throw new EntityNotFoundError("User", id);
                }
            }),
    };

    return {
        useCase: new DeleteUserUseCase(repository as never),
        repository,
    };
}

describe("DeleteUserUseCase", () => {
    test("deletes a member of the acting tenant, with the tenant in scope", async () => {
        const { useCase, repository } = setup();

        const result = await useCase.execute(ATTACKER_TENANT, VICTIM_ID);

        expect(result.success).toBe(true);
        expect(repository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(repository.deleteForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(repository.findById).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
    });

    test("deletes a user who belongs to several tenants when the acting one is among them", async () => {
        const { useCase, repository } = setup({
            tenantIds: [ATTACKER_TENANT, VICTIM_TENANT],
        });

        const result = await useCase.execute(ATTACKER_TENANT, VICTIM_ID);

        expect(result.success).toBe(true);
        expect(repository.deleteForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
    });

    test("refuses a user who exists but belongs to another tenant", async () => {
        const { useCase, repository } = setup({
            tenantIds: [VICTIM_TENANT],
        });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID),
        ).rejects.toBeInstanceOf(ForbiddenError);

        expect(repository.deleteForTenant).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
    });

    test("refuses a user id that does not exist at all", async () => {
        const { useCase, repository } = setup({ exists: false });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID),
        ).rejects.toBeInstanceOf(ForbiddenError);

        expect(repository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(repository.deleteForTenant).not.toHaveBeenCalled();
        expect(repository.delete).not.toHaveBeenCalled();
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
                    useCase.execute(tenantId, VICTIM_ID),
                ).rejects.toMatchObject({
                    code: TenantErrorCodes.TENANT_REQUIRED,
                });
                await expect(
                    useCase.execute(tenantId, VICTIM_ID),
                ).rejects.toBeInstanceOf(ValidationError);

                expect(repository.findByIdForTenant).not.toHaveBeenCalled();
                expect(repository.findById).not.toHaveBeenCalled();
                expect(repository.deleteForTenant).not.toHaveBeenCalled();
                expect(repository.delete).not.toHaveBeenCalled();
            },
        );
    });
});

describe("IUserRepository delete shapes", () => {
    test("keeps the global findById/delete pair unscoped", () => {
        const proto = PrismaUserRepository.prototype;

        expect(proto.findById).toBeInstanceOf(Function);
        expect(proto.delete).toBeInstanceOf(Function);
        // (id, options?) and (id) — neither takes a tenant.
        expect(proto.findById.length).toBe(2);
        expect(proto.delete.length).toBe(1);
    });

    test("exposes tenant-scoped variants next to it", () => {
        const proto = PrismaUserRepository.prototype;

        expect(proto.findByIdForTenant).toBeInstanceOf(Function);
        expect(proto.deleteForTenant).toBeInstanceOf(Function);
        // (tenantId, id, options?) and (tenantId, id) — tenant first.
        expect(proto.findByIdForTenant.length).toBe(3);
        expect(proto.deleteForTenant.length).toBe(2);
    });
});
