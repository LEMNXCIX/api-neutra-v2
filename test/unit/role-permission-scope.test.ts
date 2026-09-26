/**
 * Cross-tenant privilege escalation through role permission assignment.
 *
 * `PrismaRoleRepository` scoped the role itself on every write
 * (`buildTenantWhere`) and attached permissions on id alone, in four places:
 * the create path, the update transaction, `createWithPermissions` and
 * `assignPermission`. `POST/PUT /api/roles` are gated only on
 * `requirePermission('roles:write')` with no `validateDto`, so an operator
 * holding that permission in tenant A could name tenant B's permission id and
 * have it attached to a tenant-A role — and `UpdateRoleUseCase` deletes the
 * tenant's cached permission set right after, so it is live immediately. There
 * is no time-of-check window here: the connect was simply unguarded.
 *
 * The rule the fix pins is the one `buildTenantWhere` already states for
 * roles: a tenant sees its own rows plus the global ones
 * (`Permission.tenantId` NULL = global, per the schema comment). A permission
 * owned by another tenant is *refused*, not dropped: `RolePermission` is the
 * authorization table, so a 201 that silently omits a permission the caller
 * believes it granted is a false success on a security decision. A mixed list
 * is refused whole, for the same reason — a partial write would be a partial
 * grant the caller never asked for.
 */
jest.mock("@/config/db.config", () => {
    const permission = { findMany: jest.fn() };
    const rolePermission = {
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
    };
    const role = {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        // The role writes are scoped single statements now, so `update` and
        // `delete` on an id-only predicate are no longer what this repository
        // issues. The `where: { id, tenantId }` form is not a valid unique
        // selector, so `updateMany`/`deleteMany` are the statements used.
        updateMany: jest.fn(),
        deleteMany: jest.fn(),
    };
    const tx = { permission, role, rolePermission };
    return { prisma: { ...tx, $transaction: jest.fn() } };
});

import { prisma } from "@/config/db.config";
import { PrismaRoleRepository } from "@/infrastructure/database/prisma/role.prisma-repository";
import { RoleController } from "@/interface-adapters/controllers/role.controller";
import { CreateRoleUseCase } from "@/core/application/roles/create-role.use-case";
import { ForbiddenError } from "@/core/domain/errors/domain-errors";
import { Success } from "@/core/utils/use-case-result";
import { Role } from "@/core/entities/role.entity";

const TENANT = "tenant-attacker";
const VICTIM_TENANT = "tenant-victim";
const OWN_PERMISSION = "perm-attacker-products-write";
const GLOBAL_PERMISSION = "perm-global-roles-read";
const FOREIGN_PERMISSION = "perm-victim-billing-write";
const ROLE_ID = "role-tenant-a";

const NOW = new Date("2030-01-01T00:00:00.000Z");

type PermissionRow = { id: string; tenantId: string | null };

/** Own, global, and the victim's. The two tenants differ on purpose. */
const PERMISSION_FIXTURE: PermissionRow[] = [
    { id: OWN_PERMISSION, tenantId: TENANT },
    { id: GLOBAL_PERMISSION, tenantId: null },
    { id: FOREIGN_PERMISSION, tenantId: VICTIM_TENANT },
];

const prismaDb = prisma as unknown as {
    $transaction: jest.Mock;
    permission: { findMany: jest.Mock };
    role: Record<string, jest.Mock>;
    rolePermission: Record<string, jest.Mock>;
};

/**
 * Applies the `where` the repository actually sends, so a dropped tenant
 * predicate shows up as the victim's permission coming back: the attack test
 * then fails on the write, not on the mock being too strict.
 */
type PermissionWhere = {
    id?: { in?: string[] };
    OR?: Array<{ tenantId: string | null }>;
};

function applyWhere(where: PermissionWhere) {
    const requested = where?.id?.in ?? PERMISSION_FIXTURE.map((p) => p.id);
    const branches = where?.OR;
    return PERMISSION_FIXTURE.filter((permission) => {
        if (!requested.includes(permission.id)) return false;
        if (!branches) return true;
        return branches.some((branch) =>
            branch.tenantId === null
                ? permission.tenantId === null
                : permission.tenantId === branch.tenantId,
        );
    }).map((permission) => ({ id: permission.id }));
}

function roleRow(overrides: Record<string, unknown> = {}) {
    return {
        id: ROLE_ID,
        name: "EDITOR",
        description: "Editor role",
        level: 50,
        active: true,
        tenantId: TENANT,
        createdAt: NOW,
        updatedAt: NOW,
        permissions: [],
        ...overrides,
    };
}

function entityRole(): Role {
    return {
        id: ROLE_ID,
        name: "EDITOR",
        description: "Editor role",
        level: 50,
        active: true,
        createdAt: NOW,
        updatedAt: NOW,
    };
}

function setup() {
    prismaDb.permission.findMany.mockImplementation(
        async ({ where }: { where?: PermissionWhere }) =>
            applyWhere(where ?? {}),
    );
    // `findFirst` is both the by-id existence check and the by-name duplicate
    // check, so answer on the shape of the predicate: a row for the id lookups,
    // none for the name lookup that `CreateRoleUseCase` runs first.
    prismaDb.role.findFirst.mockImplementation(
        async ({ where }: { where: { id?: string } }) =>
            where?.id ? roleRow() : null,
    );
    prismaDb.role.findUnique.mockResolvedValue(roleRow());
    prismaDb.role.create.mockImplementation(async ({ data }: { data: { name: string } }) =>
        roleRow({ name: data.name }),
    );
    prismaDb.role.update.mockResolvedValue(roleRow());
    prismaDb.role.updateMany.mockResolvedValue({ count: 1 });
    prismaDb.role.deleteMany.mockResolvedValue({ count: 1 });
    prismaDb.rolePermission.create.mockResolvedValue({});
    prismaDb.rolePermission.createMany.mockResolvedValue({ count: 0 });
    prismaDb.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    prismaDb.$transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
        callback({
            permission: prismaDb.permission,
            role: prismaDb.role,
            rolePermission: prismaDb.rolePermission,
        }),
    );

    return new PrismaRoleRepository();
}

/** The nested `create` rows Prisma would turn into `role_permissions`. */
function connectedIds(call: { data: { permissions?: { create: Array<{ permission: { connect: { id: string } } }> } } }) {
    return (call.data.permissions?.create ?? []).map(
        (entry) => entry.permission.connect.id,
    );
}

function resStub() {
    const res = { json: jest.fn(), status: jest.fn() };
    res.status.mockReturnValue(res);
    return res;
}

beforeEach(() => {
    jest.clearAllMocks();
});

describe("PrismaRoleRepository.create — permission scope", () => {
    test("attaches a permission owned by the acting tenant", async () => {
        const repository = setup();

        await repository.create(TENANT, {
            name: "EDITOR",
            permissionIds: [OWN_PERMISSION],
        });

        // The scope is the same question buildTenantWhere asks of roles.
        expect(prismaDb.permission.findMany.mock.calls[0][0].where).toEqual({
            id: { in: [OWN_PERMISSION] },
            OR: [{ tenantId: TENANT }, { tenantId: null }],
        });
        expect(connectedIds(prismaDb.role.create.mock.calls[0][0])).toEqual([
            OWN_PERMISSION,
        ]);
    });

    test("attaches a global permission, the convention buildTenantWhere already sets", async () => {
        const repository = setup();

        await repository.create(TENANT, {
            name: "EDITOR",
            permissionIds: [GLOBAL_PERMISSION],
        });

        expect(connectedIds(prismaDb.role.create.mock.calls[0][0])).toEqual([
            GLOBAL_PERMISSION,
        ]);
    });

    test("refuses a permission owned by another tenant and writes nothing", async () => {
        const repository = setup();

        // Collected rather than awaited through `rejects`, because the write
        // assertion below is the one that must fail first when the guard is
        // missing: it prints the `role_permissions` row the attack produced.
        const outcome = repository
            .create(TENANT, {
                name: "EDITOR",
                permissionIds: [FOREIGN_PERMISSION],
            })
            .then(
                () => null,
                (error: unknown) => error,
            );

        expect(prismaDb.role.create).not.toHaveBeenCalled();

        const error = await outcome;
        expect(error).toBeInstanceOf(ForbiddenError);
        // Named, so a silent drop cannot pass as a refusal.
        expect((error as Error).message).toContain(FOREIGN_PERMISSION);
    });

    test("a mixed list is refused whole, so the valid ids do not ride along", async () => {
        const repository = setup();

        const outcome = repository
            .create(TENANT, {
                name: "EDITOR",
                permissionIds: [
                    OWN_PERMISSION,
                    GLOBAL_PERMISSION,
                    FOREIGN_PERMISSION,
                ],
            })
            .then(
                () => null,
                (error: unknown) => error,
            );

        // Not one of the valid ids either: a partial write would be a grant
        // the caller never asked for, and a smaller one than it believes.
        expect(prismaDb.role.create).not.toHaveBeenCalled();

        expect(await outcome).toBeInstanceOf(ForbiddenError);
    });

    test("resolves the ids once and writes the resolved set", async () => {
        const repository = setup();

        await repository.create(TENANT, {
            name: "EDITOR",
            permissionIds: [OWN_PERMISSION, GLOBAL_PERMISSION],
        });

        expect(prismaDb.permission.findMany).toHaveBeenCalledTimes(1);
        expect(prismaDb.role.create).toHaveBeenCalledTimes(1);
    });

    test("a role with no permission list touches the permission table not at all", async () => {
        const repository = setup();

        await repository.create(TENANT, { name: "EDITOR" });

        expect(prismaDb.permission.findMany).not.toHaveBeenCalled();
        expect(prismaDb.role.create.mock.calls[0][0].data.permissions).toBeUndefined();
    });
});

describe("PrismaRoleRepository.update — permission scope", () => {
    test("replaces the set with a permission owned by the acting tenant", async () => {
        const repository = setup();

        await repository.update(TENANT, ROLE_ID, {
            permissionIds: [OWN_PERMISSION],
        });

        expect(prismaDb.permission.findMany.mock.calls[0][0].where).toEqual({
            id: { in: [OWN_PERMISSION] },
            OR: [{ tenantId: TENANT }, { tenantId: null }],
        });
        expect(prismaDb.rolePermission.createMany).toHaveBeenCalledWith({
            data: [{ roleId: ROLE_ID, permissionId: OWN_PERMISSION }],
        });
    });

    test("replaces the set with a global permission", async () => {
        const repository = setup();

        await repository.update(TENANT, ROLE_ID, {
            permissionIds: [GLOBAL_PERMISSION],
        });

        expect(prismaDb.rolePermission.createMany).toHaveBeenCalledWith({
            data: [{ roleId: ROLE_ID, permissionId: GLOBAL_PERMISSION }],
        });
    });

    test("refuses a permission owned by another tenant and writes nothing", async () => {
        const repository = setup();

        const outcome = repository
            .update(TENANT, ROLE_ID, { permissionIds: [FOREIGN_PERMISSION] })
            .then(
                () => null,
                (error: unknown) => error,
            );
        // Awaited so the whole write path has run before the assertions below
        // read the mocks: `update` resolves the role and opens the transaction
        // first, so an un-awaited mock is still empty here.
        const error = await outcome;

        // The write assertion leads, so the pre-fix failure prints the
        // `role_permissions` row this produced.
        expect(prismaDb.rolePermission.createMany).not.toHaveBeenCalled();
        // All or nothing: the deleteMany would strip the tenant's current
        // permissions, so nothing may run before the refusal.
        expect(prismaDb.rolePermission.deleteMany).not.toHaveBeenCalled();
        expect(prismaDb.role.update).not.toHaveBeenCalled();

        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as Error).message).toContain(FOREIGN_PERMISSION);
    });

    test("a mixed list is refused whole", async () => {
        const repository = setup();

        const outcome = repository
            .update(TENANT, ROLE_ID, {
                permissionIds: [OWN_PERMISSION, FOREIGN_PERMISSION],
            })
            .then(
                () => null,
                (error: unknown) => error,
            );
        const error = await outcome;

        expect(prismaDb.rolePermission.createMany).not.toHaveBeenCalled();
        expect(prismaDb.rolePermission.deleteMany).not.toHaveBeenCalled();

        expect(error).toBeInstanceOf(ForbiddenError);
    });

    test("an update without a permission list leaves the set untouched", async () => {
        const repository = setup();

        await repository.update(TENANT, ROLE_ID, { name: "RENAMED" });

        expect(prismaDb.permission.findMany).not.toHaveBeenCalled();
        expect(prismaDb.rolePermission.deleteMany).not.toHaveBeenCalled();
        expect(prismaDb.rolePermission.createMany).not.toHaveBeenCalled();
    });
});

describe("the two remaining write sites", () => {
    test("createWithPermissions attaches an own and a global permission", async () => {
        const repository = setup();

        await repository.createWithPermissions(TENANT, {
            name: "ADMIN",
            level: 100,
            description: "Tenant Administrator",
            permissionIds: [OWN_PERMISSION, GLOBAL_PERMISSION],
        });

        expect(connectedIds(prismaDb.role.create.mock.calls[0][0])).toEqual([
            OWN_PERMISSION,
            GLOBAL_PERMISSION,
        ]);
    });

    test("createWithPermissions refuses another tenant's permission", async () => {
        const repository = setup();

        const outcome = repository
            .createWithPermissions(TENANT, {
                name: "ADMIN",
                level: 100,
                description: "Tenant Administrator",
                permissionIds: [FOREIGN_PERMISSION],
            })
            .then(
                () => null,
                (error: unknown) => error,
            );
        const error = await outcome;

        expect(prismaDb.role.create).not.toHaveBeenCalled();

        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as Error).message).toContain(FOREIGN_PERMISSION);
    });

    test("createWithPermissions takes the permission list as optional, like the other two", async () => {
        const repository = setup();

        await repository.createWithPermissions(TENANT, {
            name: "ADMIN",
            level: 100,
            description: "Tenant Administrator",
        });

        expect(prismaDb.permission.findMany).not.toHaveBeenCalled();
        expect(prismaDb.role.create.mock.calls[0][0].data.permissions).toBeUndefined();
    });

    test("assignPermission writes a permission of the acting tenant's scope", async () => {
        const repository = setup();

        await repository.assignPermission(TENANT, ROLE_ID, GLOBAL_PERMISSION);

        expect(prismaDb.permission.findMany.mock.calls[0][0].where).toEqual({
            id: { in: [GLOBAL_PERMISSION] },
            OR: [{ tenantId: TENANT }, { tenantId: null }],
        });
        expect(prismaDb.rolePermission.create).toHaveBeenCalledWith({
            data: { roleId: ROLE_ID, permissionId: GLOBAL_PERMISSION },
        });
    });

    test("assignPermission refuses another tenant's permission", async () => {
        const repository = setup();

        const outcome = repository
            .assignPermission(TENANT, ROLE_ID, FOREIGN_PERMISSION)
            .then(
                () => null,
                (error: unknown) => error,
            );
        const error = await outcome;

        expect(prismaDb.rolePermission.create).not.toHaveBeenCalled();

        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as Error).message).toContain(FOREIGN_PERMISSION);
    });

    test("assignPermission resolves the role in the acting tenant's scope", async () => {
        const repository = setup();

        await repository.assignPermission(TENANT, ROLE_ID, OWN_PERMISSION);

        expect(prismaDb.role.findFirst.mock.calls[0][0].where).toEqual({
            id: ROLE_ID,
            OR: [{ tenantId: TENANT }, { tenantId: null }],
        });
    });
});

/** The five fields the repository copies out of an incoming write. */
const DTO_FIELDS = {
    name: "EDITOR",
    description: "Editor role",
    level: 50,
    active: true,
    permissionIds: [OWN_PERMISSION],
} as const;

/** Keys a client could send that no role write accepts. */
const UNRECOGNISED = {
    tenantId: VICTIM_TENANT,
    id: "role-of-someone-else",
    createdAt: "1999-01-01T00:00:00.000Z",
    permissions: [{ id: FOREIGN_PERMISSION }],
} as const;

describe("RoleController narrowing", () => {
    const filler = { execute: jest.fn() } as never;
    const controllerWith = (create: unknown, update: unknown) =>
        new RoleController(create as never, filler, update as never, filler, filler);

    test("create hands the use case only the five narrowed fields", async () => {
        const create = {
            execute: jest
                .fn()
                .mockResolvedValue(Success(entityRole(), "Role created successfully")),
        };
        const res = resStub();

        await controllerWith(create, filler).create(
            { tenantId: TENANT, body: { ...DTO_FIELDS, ...UNRECOGNISED } } as never,
            res as never,
        );

        // Spelled out, so a wider allowlist cannot pass unnoticed.
        expect(Object.keys(create.execute.mock.calls[0][1]).sort()).toEqual(
            ["active", "description", "level", "name", "permissionIds"].sort(),
        );
        expect(create.execute.mock.calls[0][1]).toEqual({ ...DTO_FIELDS });
        expect(create.execute.mock.calls[0][1]).not.toHaveProperty("tenantId");
        expect(res.status).toHaveBeenCalledWith(201);
    });

    test("update hands the use case only the five narrowed fields", async () => {
        const update = {
            execute: jest
                .fn()
                .mockResolvedValue(Success(entityRole(), "Role updated successfully")),
        };
        const res = resStub();

        await controllerWith(filler, update).update(
            {
                tenantId: TENANT,
                params: { id: ROLE_ID },
                body: { ...DTO_FIELDS, ...UNRECOGNISED },
            } as never,
            res as never,
        );

        expect(Object.keys(update.execute.mock.calls[0][2]).sort()).toEqual(
            ["active", "description", "level", "name", "permissionIds"].sort(),
        );
        expect(update.execute.mock.calls[0][2]).toEqual({ ...DTO_FIELDS });
        expect(res.status).not.toHaveBeenCalled();
    });

    test("the whole chain refuses a foreign permission id in the body", async () => {
        // The real controller, the real use case and the real repository over
        // the mocked Prisma, so one request proves that the id the client
        // names never becomes a `role_permissions` row.
        const repository = setup();
        const create = new CreateRoleUseCase(repository);
        const res = resStub();

        const outcome = controllerWith(create, filler)
            .create(
                {
                    tenantId: TENANT,
                    body: {
                        name: "EDITOR",
                        permissionIds: [OWN_PERMISSION, FOREIGN_PERMISSION],
                    },
                } as never,
                res as never,
            )
            .then(
                () => null,
                (error: unknown) => error,
            );
        const error = await outcome;

        expect(prismaDb.role.create).not.toHaveBeenCalled();
        expect(prismaDb.rolePermission.createMany).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();

        expect(error).toBeInstanceOf(ForbiddenError);
    });
});
