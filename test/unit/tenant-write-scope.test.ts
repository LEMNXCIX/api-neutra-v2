/**
 * The four writes that read in the acting tenant's scope and then wrote on
 * `id` alone.
 *
 * `Role.tenantId` and `Permission.tenantId` are nullable, so
 * `where: { id, tenantId }` is not a unique selector Prisma will take, and
 * `prisma.update` cannot carry the tenant. The shape already established on
 * this branch for users in 228a060/572b7a3 is the one used here: one
 * `updateMany`/`deleteMany` statement carrying the tenant predicate, a count
 * of zero mapped to the same `EntityNotFoundError` the global path throws,
 * then a scoped read-back.
 *
 * Two things are pinned beyond "the write is scoped":
 *
 *  1. The window, not just the id. A foreign id is already refused by the
 *     pre-check, so a suite that only ever attacks with a foreign id proves
 *     nothing about the write. `reassignAfterRead` models the real gap — the
 *     row reads as the tenant's own and is reassigned before the write lands —
 *     which is the only way a check-then-write reaches another tenant.
 *  2. `PrismaPermissionRepository.findById` was a global `findUnique({ where:
 *     { id } })` with the tenant test applied to the returned row, so the
 *     *read* was unscoped too. The scoping is asserted on the `where` the
 *     repository emits, which is what a post-filter cannot satisfy.
 *
 * The global-row decision, pinned here on purpose: `buildTenantWhere` defines
 * a tenant's authority over `Role`/`Permission` as "own rows plus the global
 * ones" (`tenantId` NULL = global, per the schema comment), and
 * `assignPermission`/`resolvePermissionIds` already write *through* a global
 * role on this branch. These four paths therefore keep the same scope rather
 * than inventing a narrower one, so a global row stays writable by a tenant
 * and the four tests below say so out loud. Whether a tenant may mutate a
 * global row at all is an authorization-layer question, not a repository one.
 */
jest.mock("@/config/db.config", () => {
    const permission = {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
    };
    const role = {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
    };
    const rolePermission = {
        create: jest.fn(),
        createMany: jest.fn(),
        deleteMany: jest.fn(),
    };
    return {
        prisma: {
            permission,
            role,
            rolePermission,
            $transaction: jest.fn(),
        },
    };
});

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { prisma } from "@/config/db.config";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import { PrismaPermissionRepository } from "@/infrastructure/database/prisma/permission.prisma-repository";
import { PrismaRoleRepository } from "@/infrastructure/database/prisma/role.prisma-repository";

const ROOT = join(__dirname, "../..");

/** The attacker. Every write below is attempted as this tenant. */
const TENANT = "tenant-attacker";
/** The victim. Deliberately a different id, so "own" and "foreign" differ. */
const VICTIM_TENANT = "tenant-victim";

const OWN_PERMISSION = "perm-attacker-products-write";
const GLOBAL_PERMISSION = "perm-global-roles-read";
const VICTIM_PERMISSION = "perm-victim-billing-write";

const OWN_ROLE = "role-attacker-editor";
const GLOBAL_ROLE = "role-global-admin";
const VICTIM_ROLE = "role-victim-billing";

const NOW = new Date("2030-01-01T00:00:00.000Z");

type Scope = { tenantId: string | null };

const permissionRows: FixtureRow[] = [
    { id: OWN_PERMISSION, name: "products:write", tenantId: TENANT },
    { id: GLOBAL_PERMISSION, name: "roles:read", tenantId: null },
    { id: VICTIM_PERMISSION, name: "billing:write", tenantId: VICTIM_TENANT },
];

const roleRows: FixtureRow[] = [
    { id: OWN_ROLE, name: "EDITOR", tenantId: TENANT },
    { id: GLOBAL_ROLE, name: "ADMIN", tenantId: null },
    { id: VICTIM_ROLE, name: "BILLING", tenantId: VICTIM_TENANT },
];

/**
 * The row ids the next scoped *read* resolves, then immediately reassigns to
 * `reassignTo`. It is the check-then-write window made observable: the read
 * answers with the pre-flip row, and the write then runs against a row the
 * tenant no longer owns.
 */
let reassignAfterRead: { id: string; to: string } | null = null;

type Where = {
    id?: string | { in: string[] };
    name?: string;
    OR?: Array<{ tenantId: string | null }>;
};

type FixtureRow = Scope & { id: string; name: string };

/** Applies the `where` the repository actually sends, tenant predicate included. */
function applyWhere(
    rows: FixtureRow[],
    where: Where | undefined,
    ignoreTenant = false,
) {
    return rows.filter((row) => {
        if (typeof where?.id === "string" && where.id !== row.id) return false;
        if (
            where?.id &&
            typeof where.id === "object" &&
            !where.id.in.includes(row.id)
        ) {
            return false;
        }
        if (where?.name !== undefined && where.name !== row.name) return false;
        if (where?.OR && !ignoreTenant) {
            return where.OR.some((branch) =>
                branch.tenantId === null
                    ? row.tenantId === null
                    : row.tenantId === branch.tenantId,
            );
        }
        return true;
    });
}

const prismaDb = prisma as unknown as {
    $transaction: jest.Mock;
    permission: Record<string, jest.Mock>;
    role: Record<string, jest.Mock>;
    rolePermission: Record<string, jest.Mock>;
};

function permissionRow(row: FixtureRow) {
    return {
        id: row.id,
        name: row.name,
        description: `${row.name} description`,
        active: true,
        tenantId: row.tenantId,
        createdAt: NOW,
    };
}

function roleRow(row: FixtureRow) {
    return {
        id: row.id,
        name: row.name,
        description: `${row.name} role`,
        level: 10,
        active: true,
        tenantId: row.tenantId,
        createdAt: NOW,
        updatedAt: NOW,
        permissions: [],
    };
}

function setup() {
    reassignAfterRead = null;

    // The scoped read. Answers with the row as it stands, then reassigns it
    // when the test asked for the window.
    const readPermission = async (args: { where?: Where }) => {
        const found = applyWhere(permissionRows, args.where)[0];
        if (!found) return null;
        const snapshot = permissionRow(found);
        if (reassignAfterRead && reassignAfterRead.id === found.id) {
            found.tenantId = reassignAfterRead.to;
        }
        return snapshot;
    };

    prismaDb.permission.findFirst.mockImplementation(readPermission);
    // The pre-fix read: a global findUnique keyed on `id` alone, with no
    // tenant predicate anywhere in the query.
    prismaDb.permission.findUnique.mockImplementation(
        async (args: { where?: Where }) => {
            const found =
                applyWhere(permissionRows, args.where, false)[0] ?? undefined;
            const row = found ?? permissionRows[0];
            const snapshot = permissionRow(row);
            if (reassignAfterRead && reassignAfterRead.id === row.id) {
                row.tenantId = reassignAfterRead.to;
            }
            return snapshot;
        },
    );
    prismaDb.permission.findMany.mockImplementation(
        async ({ where }: { where: Where }) =>
            applyWhere(permissionRows, where).map((row) => ({
                id: row.id,
            })),
    );
    prismaDb.permission.updateMany.mockImplementation(
        async ({ where }: { where: Where }) => ({
            count: applyWhere(permissionRows, where).length,
        }),
    );
    prismaDb.permission.deleteMany.mockImplementation(
        async ({ where }: { where: Where }) => ({
            count: applyWhere(permissionRows, where).length,
        }),
    );
    prismaDb.permission.update.mockImplementation(
        async ({ where }: { where: Where }) => {
            const found =
                applyWhere(permissionRows, where)[0] ?? permissionRows[0];
            return permissionRow(found);
        },
    );
    prismaDb.permission.delete.mockResolvedValue({});

    prismaDb.role.findFirst.mockImplementation(
        async (args: { where?: Where }) => {
            const found = applyWhere(roleRows, args.where)[0];
            if (!found) return null;
            const snapshot = roleRow(found);
            if (reassignAfterRead && reassignAfterRead.id === found.id) {
                found.tenantId = reassignAfterRead.to;
            }
            return snapshot;
        },
    );
    prismaDb.role.findUnique.mockResolvedValue(roleRow(roleRows[0]));
    prismaDb.role.findMany.mockResolvedValue([]);
    prismaDb.role.updateMany.mockImplementation(
        async ({ where }: { where: Where }) => ({
            count: applyWhere(roleRows, where).length,
        }),
    );
    prismaDb.role.deleteMany.mockImplementation(
        async ({ where }: { where: Where }) => ({
            count: applyWhere(roleRows, where).length,
        }),
    );
    prismaDb.role.update.mockImplementation(
        async ({ where }: { where: Where }) => {
            const found = applyWhere(roleRows, where)[0] ?? roleRows[0];
            return roleRow(found);
        },
    );
    prismaDb.role.delete.mockResolvedValue({});
    prismaDb.rolePermission.createMany.mockResolvedValue({ count: 0 });
    prismaDb.rolePermission.deleteMany.mockResolvedValue({ count: 0 });
    prismaDb.$transaction.mockImplementation(
        async (callback: (tx: unknown) => unknown) =>
            callback({
                permission: prismaDb.permission,
                role: prismaDb.role,
                rolePermission: prismaDb.rolePermission,
            }),
    );

    return {
        permissions: new PrismaPermissionRepository(),
        roles: new PrismaRoleRepository(),
    };
}

/** Awaits an outcome without throwing, so a write assertion can be checked first. */
function settle(promise: Promise<unknown>): Promise<unknown> {
    return promise.then(
        () => null,
        (error: unknown) => error,
    );
}

/** The scope `buildTenantWhere` states, spelled out so it cannot drift. */
const TENANT_SCOPE = { OR: [{ tenantId: TENANT }, { tenantId: null }] };

beforeEach(() => {
    jest.clearAllMocks();
    permissionRows[0].tenantId = TENANT;
    permissionRows[1].tenantId = null;
    permissionRows[2].tenantId = VICTIM_TENANT;
    roleRows[0].tenantId = TENANT;
    roleRows[1].tenantId = null;
    roleRows[2].tenantId = VICTIM_TENANT;
});

describe("case 1 — permission update is scoped in the write, not only in the read", () => {
    test("a permission owned by the victim's tenant is not written", async () => {
        const { permissions } = setup();

        const error = await settle(
            permissions.update(TENANT, VICTIM_PERMISSION, {
                name: "billing:manage",
            }),
        );

        // The pre-fix statement is named so the failure prints the write the
        // unguarded `where: { id }` produced.
        expect(prismaDb.permission.update).not.toHaveBeenCalled();
        expect(prismaDb.permission.updateMany).toHaveBeenCalledTimes(1);
        expect(prismaDb.permission.updateMany.mock.calls[0][0].where).toEqual({
            id: VICTIM_PERMISSION,
            ...TENANT_SCOPE,
        });
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });

    test("the write comes first: no read of the permission precedes it", async () => {
        const { permissions } = setup();
        reassignAfterRead = { id: OWN_PERMISSION, to: VICTIM_TENANT };

        const error = await settle(
            permissions.update(TENANT, OWN_PERMISSION, { name: "renamed" }),
        );

        // `UpdatePermissionUseCase` already resolved the permission in scope
        // before it got here. A pre-check inside the repository would only
        // re-open the gap between that read and the write, which is the shape
        // this path no longer has: one scoped statement, then the read-back
        // that produces the returned entity.
        const write =
            prismaDb.permission.updateMany.mock.invocationCallOrder[0];
        const reads = prismaDb.permission.findFirst.mock.invocationCallOrder;
        expect(reads.every((order) => order > write)).toBe(true);
        expect(prismaDb.permission.findUnique).not.toHaveBeenCalled();
        expect(prismaDb.permission.updateMany).toHaveBeenCalledTimes(1);
        expect(error).toBeNull();
    });

    test("a permission the tenant owns is written and read back in scope", async () => {
        const { permissions } = setup();

        const updated = await permissions.update(TENANT, OWN_PERMISSION, {
            description: "still ours",
        });

        expect(prismaDb.permission.updateMany.mock.calls[0][0].where).toEqual({
            id: OWN_PERMISSION,
            ...TENANT_SCOPE,
        });
        expect(updated.id).toBe(OWN_PERMISSION);
    });
});

describe("case 5 — the permission read is scoped in the query, not by a post-filter", () => {
    test("findById emits the tenant predicate instead of reading globally", async () => {
        const { permissions } = setup();

        await permissions.findById(TENANT, OWN_PERMISSION);

        // A post-filter over `findUnique({ where: { id } })` cannot satisfy
        // this: the predicate is asserted on the query that was sent.
        expect(prismaDb.permission.findUnique).not.toHaveBeenCalled();
        expect(prismaDb.permission.findFirst).toHaveBeenCalledTimes(1);
        expect(prismaDb.permission.findFirst.mock.calls[0][0].where).toEqual({
            id: OWN_PERMISSION,
            ...TENANT_SCOPE,
        });
    });

    test("findById answers null for a row owned by the victim's tenant", async () => {
        const { permissions } = setup();

        await expect(
            permissions.findById(TENANT, VICTIM_PERMISSION),
        ).resolves.toBeNull();
    });

    test("findById reaches a global row, the scope the read has always stated", async () => {
        const { permissions } = setup();

        await expect(
            permissions.findById(TENANT, GLOBAL_PERMISSION),
        ).resolves.toMatchObject({ id: GLOBAL_PERMISSION });
    });

    test("without a tenant the predicate is absent, not a filter that hides everything", async () => {
        const { permissions } = setup();

        await expect(
            permissions.findById(undefined, VICTIM_PERMISSION),
        ).resolves.toMatchObject({
            id: VICTIM_PERMISSION,
        });
        expect(prismaDb.permission.findFirst.mock.calls[0][0].where).toEqual({
            id: VICTIM_PERMISSION,
        });
    });
});

describe("case 2 — role update is scoped on both branches", () => {
    test("the transaction branch refuses a role owned by the victim's tenant", async () => {
        const { roles } = setup();

        const error = await settle(
            roles.update(TENANT, VICTIM_ROLE, {
                name: "BILLING_ADMIN",
                permissionIds: [OWN_PERMISSION],
            }),
        );

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(prismaDb.role.updateMany).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });

    test("the transaction branch writes a scoped updateMany, not `where: { id }`", async () => {
        const { roles } = setup();

        await roles.update(TENANT, OWN_ROLE, {
            name: "EDITOR",
            permissionIds: [OWN_PERMISSION],
        });

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(prismaDb.role.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: OWN_ROLE, ...TENANT_SCOPE },
            }),
        );
    });

    test("the no-permissions branch refuses a role owned by the victim's tenant", async () => {
        const { roles } = setup();

        const error = await settle(
            roles.update(TENANT, VICTIM_ROLE, { name: "BILLING_ADMIN" }),
        );

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(prismaDb.role.updateMany).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });

    test("the no-permissions branch writes a scoped updateMany, not `where: { id }`", async () => {
        const { roles } = setup();

        await roles.update(TENANT, OWN_ROLE, { name: "RENAMED" });

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(prismaDb.role.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: OWN_ROLE, ...TENANT_SCOPE },
            }),
        );
    });

    test("the window: the role is reassigned to the victim after the pre-check", async () => {
        const { roles } = setup();
        reassignAfterRead = { id: OWN_ROLE, to: VICTIM_TENANT };

        const error = await settle(
            roles.update(TENANT, OWN_ROLE, { name: "RENAMED" }),
        );

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });
});

describe("case 3 — role delete is scoped in the statement", () => {
    test("a role owned by the victim's tenant is not deleted", async () => {
        const { roles } = setup();

        const error = await settle(roles.delete(TENANT, VICTIM_ROLE));

        expect(prismaDb.role.delete).not.toHaveBeenCalled();
        expect(prismaDb.role.deleteMany).not.toHaveBeenCalled();
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });

    test("a role the tenant owns is deleted, with the tenant in the statement", async () => {
        const { roles } = setup();

        await roles.delete(TENANT, OWN_ROLE);

        expect(prismaDb.role.deleteMany.mock.calls[0][0].where).toEqual({
            id: OWN_ROLE,
            ...TENANT_SCOPE,
        });
    });

    test("the window: the role is reassigned to the victim after the pre-check", async () => {
        const { roles } = setup();
        reassignAfterRead = { id: OWN_ROLE, to: VICTIM_TENANT };

        const error = await settle(roles.delete(TENANT, OWN_ROLE));

        // Pre-fix this was `prisma.role.delete({ where: { id } })`: the row read
        // as the tenant's own and was deleted after it stopped being theirs.
        expect(prismaDb.role.delete).not.toHaveBeenCalled();
        expect(prismaDb.role.deleteMany).toHaveBeenCalledWith({
            where: { id: OWN_ROLE, ...TENANT_SCOPE },
        });
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });
});

describe("case 4 — the global-row decision, pinned", () => {
    test("a global permission stays writable: the same scope the read already stated", async () => {
        const { permissions } = setup();

        const updated = await permissions.update(TENANT, GLOBAL_PERMISSION, {
            description: "edited by a tenant",
        });

        expect(prismaDb.permission.updateMany.mock.calls[0][0].where).toEqual({
            id: GLOBAL_PERMISSION,
            ...TENANT_SCOPE,
        });
        expect(updated.id).toBe(GLOBAL_PERMISSION);
    });

    test("a global role stays writable on the transaction branch", async () => {
        const { roles } = setup();

        const updated = await roles.update(TENANT, GLOBAL_ROLE, {
            name: "ADMIN",
            permissionIds: [GLOBAL_PERMISSION],
        });

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(updated.id).toBe(GLOBAL_ROLE);
    });

    test("a global role stays writable on the no-permissions branch", async () => {
        const { roles } = setup();

        const updated = await roles.update(TENANT, GLOBAL_ROLE, {
            description: "edited by a tenant",
        });

        expect(prismaDb.role.update).not.toHaveBeenCalled();
        expect(updated.id).toBe(GLOBAL_ROLE);
    });

    test("a global role stays deletable", async () => {
        const { roles } = setup();

        await roles.delete(TENANT, GLOBAL_ROLE);

        expect(prismaDb.role.deleteMany.mock.calls[0][0].where).toEqual({
            id: GLOBAL_ROLE,
            ...TENANT_SCOPE,
        });
    });

    test("without a tenant the predicate is absent, so the platform path still writes", async () => {
        const { roles } = setup();

        await roles.update(undefined, VICTIM_ROLE, { name: "PLATFORM" });

        expect(prismaDb.role.updateMany.mock.calls[0][0].where).toEqual({
            id: VICTIM_ROLE,
        });
    });
});

describe("the same defect on permission delete, closed the same way", () => {
    test("a permission owned by the victim's tenant is not deleted", async () => {
        const { permissions } = setup();

        const error = await settle(
            permissions.delete(TENANT, VICTIM_PERMISSION),
        );

        expect(prismaDb.permission.delete).not.toHaveBeenCalled();
        expect(prismaDb.permission.deleteMany).toHaveBeenCalledWith({
            where: { id: VICTIM_PERMISSION, ...TENANT_SCOPE },
        });
        expect(error).toBeInstanceOf(EntityNotFoundError);
    });

    test("a permission the tenant owns is deleted", async () => {
        const { permissions } = setup();

        await permissions.delete(TENANT, OWN_PERMISSION);

        expect(prismaDb.permission.deleteMany.mock.calls[0][0].where).toEqual({
            id: OWN_PERMISSION,
            ...TENANT_SCOPE,
        });
    });
});

describe("the sources, read directly", () => {
    /** Comments carry the old shape as prose, so they are not code. */
    function code(relativePath: string): string {
        return readFileSync(join(ROOT, relativePath), "utf-8")
            .replace(/\/\*[\s\S]*?\*\//g, "")
            .replace(/\/\/.*$/gm, "");
    }

    const permissionSource = code(
        "infrastructure/database/prisma/permission.prisma-repository.ts",
    );
    const roleSource = code(
        "infrastructure/database/prisma/role.prisma-repository.ts",
    );

    test("neither repository issues a permission or role write on a bare `where: { id }`", () => {
        const unguarded = [
            ...permissionSource.matchAll(
                /prisma\.permission\.(update|delete)\s*\(\s*\{[^}]*where:\s*\{\s*id\s*[,}]/g,
            ),
            ...roleSource.matchAll(
                /prisma\.role\.(update|delete)\s*\(\s*\{[^}]*where:\s*\{\s*id\s*[,}]/g,
            ),
            ...roleSource.matchAll(
                /tx\.role\.update\s*\(\s*\{[^}]*where:\s*\{\s*id\s*[,}]/g,
            ),
        ].map((match) => match[0].replace(/\s+/g, " "));

        expect(unguarded).toEqual([]);
    });

    test("the permission read no longer goes through a global findUnique", () => {
        expect(permissionSource).not.toMatch(
            /findUnique\s*\(\s*\{\s*where:\s*\{\s*id\s*\}\s*\}\s*\)/,
        );
    });
});
