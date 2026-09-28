/**
 * Regression coverage for the cross-tenant role assignment hole:
 * AssignRoleToUserUseCase read the target through the global `findById` and
 * then wrote `addTenant(userId, tenantId, roleId)`. The role read next to it
 * was already tenant-scoped, so `users:manage` in tenant A could attach any
 * user id in the system — including a customer who belongs only to tenant B —
 * to tenant A with a tenant-A ADMIN role, and a STAFF role additionally
 * created a Staff row in tenant A for that outsider. Mirrors the delete
 * coverage in delete-user.use-case.test.ts and the update coverage in
 * update-user.use-case.test.ts.
 */
import { AssignRoleToUserUseCase } from "@/core/application/users/assign-role.use-case";
import {
    EntityNotFoundError,
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import type { Role } from "@/core/entities/role.entity";
import type { User } from "@/core/entities/user.entity";
import { TenantErrorCodes } from "@/types/error-codes";

const ATTACKER_TENANT = "tenant-attacker";
const VICTIM_TENANT = "tenant-victim";
const VICTIM_ID = "user-victim";
const ADMIN_ROLE_ID = "role-attacker-admin";
const NOW = new Date("2030-01-01T00:00:00.000Z");

function role(name: string): Role {
    return {
        id: `${ATTACKER_TENANT}-${name}`,
        name,
        level: name === "ADMIN" ? 10 : 1,
        active: true,
        description: null,
        permissions: [],
        createdAt: NOW,
        updatedAt: NOW,
    } as Role;
}

/** Attacker and victim are deliberately different fixture values. */
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

function setup({
    tenantIds = [ATTACKER_TENANT],
    exists = true,
    roleExists = true,
    roleName = "USER",
    existingStaff = null,
}: {
    tenantIds?: string[];
    exists?: boolean;
    roleExists?: boolean;
    roleName?: string;
    existingStaff?: { id: string; active: boolean } | null;
} = {}) {
    const user = memberUser(tenantIds);

    const userRepository = {
        // Global, unscoped: what the auth flows legitimately need, and what
        // this use case used to reach the target through.
        findById: jest.fn().mockResolvedValue(exists ? user : null),
        addTenant: jest.fn().mockResolvedValue(undefined),
        // Tenant-scoped: mirrors the Prisma membership predicate.
        findByIdForTenant: jest
            .fn()
            .mockImplementation(async (tenantId: string, id: string) =>
                exists && id === VICTIM_ID && tenantIds.includes(tenantId)
                    ? user
                    : null,
            ),
    };

    const roleRepository = {
        findById: jest
            .fn()
            .mockResolvedValue(roleExists ? role(roleName) : null),
    };

    const staffRepository = {
        findByUserId: jest.fn().mockResolvedValue(existingStaff),
        create: jest.fn().mockResolvedValue({ id: "staff-1" }),
        update: jest.fn().mockResolvedValue({ id: "staff-1" }),
    };

    const cacheProvider = { del: jest.fn().mockResolvedValue(undefined) };

    const useCase = new AssignRoleToUserUseCase(
        userRepository as never,
        roleRepository as never,
        staffRepository as never,
        cacheProvider as never,
    );

    return {
        useCase,
        userRepository,
        roleRepository,
        staffRepository,
        cacheProvider,
    };
}

describe("AssignRoleToUserUseCase", () => {
    test("assigns a role to a member of the acting tenant, scoped end to end", async () => {
        const { useCase, userRepository, cacheProvider } = setup();

        const result = await useCase.execute(
            ATTACKER_TENANT,
            VICTIM_ID,
            ADMIN_ROLE_ID,
        );

        expect(result.success).toBe(true);
        expect(userRepository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(userRepository.addTenant).toHaveBeenCalledWith(
            VICTIM_ID,
            ATTACKER_TENANT,
            ADMIN_ROLE_ID,
        );
        expect(cacheProvider.del).toHaveBeenCalledWith(
            `user:permissions:${VICTIM_ID}:${ATTACKER_TENANT}`,
        );
        // The global lookup must not be reachable from a tenant-acting caller.
        expect(userRepository.findById).not.toHaveBeenCalled();
    });

    test("assigns a user who belongs to several tenants when the acting one is among them", async () => {
        const { useCase, userRepository } = setup({
            tenantIds: [ATTACKER_TENANT, VICTIM_TENANT],
        });

        const result = await useCase.execute(
            ATTACKER_TENANT,
            VICTIM_ID,
            ADMIN_ROLE_ID,
        );

        expect(result.success).toBe(true);
        expect(userRepository.addTenant).toHaveBeenCalledWith(
            VICTIM_ID,
            ATTACKER_TENANT,
            ADMIN_ROLE_ID,
        );
    });

    test("refuses a user who exists but belongs to another tenant, and never attaches them", async () => {
        const { useCase, userRepository, roleRepository, staffRepository } =
            setup({ tenantIds: [VICTIM_TENANT] });

        const outcome = await useCase
            .execute(ATTACKER_TENANT, VICTIM_ID, ADMIN_ROLE_ID)
            .then(() => null)
            .catch((error: unknown) => error);

        // The side effect is asserted first: this is the whole attack. Before
        // the fix the call is made — a tenant-B customer attached to tenant A
        // with a tenant-A ADMIN role.
        expect(userRepository.addTenant).not.toHaveBeenCalled();
        expect(outcome).toBeInstanceOf(ForbiddenError);
        expect(roleRepository.findById).not.toHaveBeenCalled();
        expect(staffRepository.create).not.toHaveBeenCalled();
        expect(staffRepository.update).not.toHaveBeenCalled();
    });

    test("refuses a user id that does not exist at all, indistinguishably", async () => {
        const { useCase, userRepository } = setup({ exists: false });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID, ADMIN_ROLE_ID),
        ).rejects.toBeInstanceOf(ForbiddenError);

        expect(userRepository.findByIdForTenant).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
        expect(userRepository.addTenant).not.toHaveBeenCalled();
    });

    test("refuses a role that belongs to another tenant, and never attaches anything", async () => {
        // `roleRepository.findById` is already tenant-scoped, so the role id
        // is a role of the acting tenant. A role from tenant B resolves to
        // null here and must not reach addTenant.
        const { useCase, userRepository, staffRepository } = setup({
            roleExists: false,
        });

        await expect(
            useCase.execute(ATTACKER_TENANT, VICTIM_ID, ADMIN_ROLE_ID),
        ).rejects.toBeInstanceOf(EntityNotFoundError);

        expect(userRepository.addTenant).not.toHaveBeenCalled();
        expect(staffRepository.create).not.toHaveBeenCalled();
    });

    test("a STAFF role creates the Staff row in the acting tenant only", async () => {
        const { useCase, staffRepository } = setup({
            tenantIds: [ATTACKER_TENANT, VICTIM_TENANT],
            roleName: "STAFF",
        });

        await useCase.execute(ATTACKER_TENANT, VICTIM_ID, ADMIN_ROLE_ID);

        expect(staffRepository.create).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            expect.objectContaining({ userId: VICTIM_ID, active: true }),
        );
        expect(staffRepository.findByUserId).toHaveBeenCalledWith(
            ATTACKER_TENANT,
            VICTIM_ID,
        );
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
            "rejects %s before touching a repository",
            async (_label, tenantId) => {
                const {
                    useCase,
                    userRepository,
                    roleRepository,
                    staffRepository,
                    cacheProvider,
                } = setup();

                await expect(
                    useCase.execute(tenantId, VICTIM_ID, ADMIN_ROLE_ID),
                ).rejects.toMatchObject({
                    code: TenantErrorCodes.TENANT_REQUIRED,
                });
                await expect(
                    useCase.execute(tenantId, VICTIM_ID, ADMIN_ROLE_ID),
                ).rejects.toBeInstanceOf(ValidationError);

                expect(userRepository.findByIdForTenant).not.toHaveBeenCalled();
                expect(userRepository.findById).not.toHaveBeenCalled();
                expect(userRepository.addTenant).not.toHaveBeenCalled();
                expect(roleRepository.findById).not.toHaveBeenCalled();
                expect(staffRepository.findByUserId).not.toHaveBeenCalled();
                expect(staffRepository.create).not.toHaveBeenCalled();
                expect(cacheProvider.del).not.toHaveBeenCalled();
            },
        );
    });
});
