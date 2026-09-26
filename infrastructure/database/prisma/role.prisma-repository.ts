import { Role as PrismaRole, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IRoleRepository, RoleCreateData, RoleUpdateData } from "@/core/repositories/role.repository.interface";
import { Role } from "@/core/entities/role.entity";
import { Permission } from "@/core/entities/permission.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
    ForbiddenError,
} from "@/core/domain/errors/domain-errors";

type RoleWithPermissions = Prisma.RoleGetPayload<{
    include: { permissions: { include: { permission: true } } };
}>;

export class PrismaRoleRepository implements IRoleRepository {
    private mapToEntity(prismaRole: RoleWithPermissions): Role {
        return {
            id: prismaRole.id,
            name: prismaRole.name,
            description: prismaRole.description,
            level: prismaRole.level,
            active: prismaRole.active,
            permissions:
                prismaRole.permissions?.map((rp) => ({
                    id: rp.permission.id,
                    name: rp.permission.name,
                    description: rp.permission.description,
                    active: rp.permission.active,
                    createdAt: rp.permission.createdAt,
                })) || [],
            createdAt: prismaRole.createdAt,
            updatedAt: prismaRole.updatedAt,
        };
    }

    private buildTenantWhere(
        tenantId: string | undefined,
    ): Prisma.RoleWhereInput {
        if (tenantId) {
            return { OR: [{ tenantId }, { tenantId: null }] };
        }
        return {};
    }

    /**
     * The permission equivalent of `buildTenantWhere`, asked of one model
     * over. `Permission.tenantId` carries the same convention as
     * `Role.tenantId` — NULL means global — so "own rows plus the global
     * ones" is the same answer here, and the shape is deliberately identical
     * so the two cannot drift apart.
     */
    private buildPermissionWhere(
        tenantId: string | undefined,
    ): Prisma.PermissionWhereInput {
        if (tenantId) {
            return { OR: [{ tenantId }, { tenantId: null }] };
        }
        return {};
    }

    /**
     * The single gate every `role_permissions` write passes through, so the
     * four write sites cannot drift: resolve `permissionIds` against the
     * tenant's own permissions plus the global ones, and refuse the rest
     * before any row is written.
     *
     * Refused, not dropped. `RolePermission` is the authorization table, so a
     * 201 that silently omits an id the caller named is a false success on a
     * security decision: the operator believes a permission is attached and it
     * is not, and the next thing they do is assume it works. Refusing also
     * turns a mixed list into an all-or-nothing answer, which is why this
     * returns the caller's own array rather than a filtered one — nothing
     * reaches the write that was not proven in scope.
     *
     * `ForbiddenError` rather than `ValidationError` because a permission id
     * that resolves to another tenant is an authorization boundary, not a
     * malformed body, and it answers 403 like the three user endpoints fixed
     * in bd92bab/228a060.
     */
    private async resolvePermissionIds(
        client: Pick<typeof prisma, "permission">,
        tenantId: string | undefined,
        permissionIds: string[],
    ): Promise<string[]> {
        if (permissionIds.length === 0) {
            return permissionIds;
        }

        const visible = await client.permission.findMany({
            where: {
                id: { in: permissionIds },
                ...this.buildPermissionWhere(tenantId),
            },
            select: { id: true },
        });

        const visibleIds = new Set(visible.map((permission) => permission.id));
        const refused = permissionIds.filter((id) => !visibleIds.has(id));
        if (refused.length > 0) {
            throw new ForbiddenError(
                `Permission not available to this tenant: ${refused.join(", ")}`,
            );
        }

        return permissionIds;
    }

    async findAll(tenantId: string | undefined): Promise<Role[]> {
        const where = this.buildTenantWhere(tenantId);

        const roles = await prisma.role.findMany({
            where,
            include: { permissions: { include: { permission: true } } },
            orderBy: { level: "asc" },
        });
        return roles.map((r) => this.mapToEntity(r));
    }

    async findAllPaginated(
        tenantId: string | undefined,
        page: number,
        limit: number,
        search?: string,
    ): Promise<{ roles: Role[]; total: number }> {
        const skip = (page - 1) * limit;
        const where: Prisma.RoleWhereInput = this.buildTenantWhere(tenantId);

        if (search) {
            where.name = { contains: search, mode: "insensitive" };
        }

        const [roles, total] = await Promise.all([
            prisma.role.findMany({
                where,
                skip,
                take: limit,
                include: { permissions: { include: { permission: true } } },
                orderBy: { level: "asc" },
            }),
            prisma.role.count({ where }),
        ]);

        return {
            roles: roles.map((r) => this.mapToEntity(r)),
            total,
        };
    }

    async findById(
        tenantId: string | undefined,
        id: string,
    ): Promise<Role | null> {
        const where: Prisma.RoleWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };

        const role = await prisma.role.findFirst({
            where,
            include: { permissions: { include: { permission: true } } },
        });
        return role ? this.mapToEntity(role) : null;
    }

    async findByName(
        tenantId: string | undefined,
        name: string,
    ): Promise<Role | null> {
        const where: Prisma.RoleWhereInput = {
            name,
            ...this.buildTenantWhere(tenantId),
        };

        const role = await prisma.role.findFirst({
            where,
            include: { permissions: { include: { permission: true } } },
        });
        return role ? this.mapToEntity(role) : null;
    }

    async create(
        tenantId: string | undefined,
        data: RoleCreateData,
    ): Promise<Role> {
        try {
            const { permissionIds, ...roleData } = data;
            const scopedPermissionIds = permissionIds
                ? await this.resolvePermissionIds(
                      prisma,
                      tenantId,
                      permissionIds,
                  )
                : undefined;
            const role = await prisma.role.create({
                data: {
                    name: roleData.name,
                    description: roleData.description,
                    level: roleData.level,
                    active: roleData.active,
                    tenantId: tenantId || null,
                    permissions: scopedPermissionIds
                        ? {
                              create: scopedPermissionIds.map(
                                  (permissionId) => ({
                                      permission: {
                                          connect: { id: permissionId },
                                      },
                                  }),
                              ),
                          }
                        : undefined,
                },
                include: { permissions: { include: { permission: true } } },
            });
            return this.mapToEntity(role);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError("Role", target, data.name);
            }
            throw error;
        }
    }

    async update(
        tenantId: string | undefined,
        id: string,
        data: RoleUpdateData,
    ): Promise<Role> {
        const { permissionIds, ...roleData } = data;

        const where: Prisma.RoleWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };
        const existingRole = await prisma.role.findFirst({ where });

        if (!existingRole) {
            throw new EntityNotFoundError("Role", id);
        }

        if (permissionIds) {
            return await prisma.$transaction(async (tx) => {
                // First statement in the transaction, so a refused id leaves
                // the role's current permission set in place: the deleteMany
                // below would otherwise strip it before the refusal landed.
                const scopedPermissionIds = await this.resolvePermissionIds(
                    tx,
                    tenantId,
                    permissionIds,
                );

                await tx.role.update({
                    where: { id },
                    data: {
                        name: roleData.name,
                        description: roleData.description,
                        level: roleData.level,
                        active: roleData.active,
                    },
                });

                await tx.rolePermission.deleteMany({
                    where: { roleId: id },
                });

                if (scopedPermissionIds.length > 0) {
                    await tx.rolePermission.createMany({
                        data: scopedPermissionIds.map((permissionId) => ({
                            roleId: id,
                            permissionId,
                        })),
                    });
                }

                const updatedRole = await tx.role.findUnique({
                    where: { id },
                    include: { permissions: { include: { permission: true } } },
                });
                return this.mapToEntity(updatedRole!);
            });
        } else {
            const role = await prisma.role.update({
                where: { id },
                data: {
                    name: roleData.name,
                    description: roleData.description,
                    level: roleData.level,
                    active: roleData.active,
                },
                include: { permissions: { include: { permission: true } } },
            });
            return this.mapToEntity(role);
        }
    }

    async delete(tenantId: string | undefined, id: string): Promise<void> {
        const where: Prisma.RoleWhereInput = {
            id,
            ...this.buildTenantWhere(tenantId),
        };
        const existingRole = await prisma.role.findFirst({ where });

        if (!existingRole) {
            throw new EntityNotFoundError("Role", id);
        }

        await prisma.role.delete({ where: { id } });
    }

    async createWithPermissions(
        tenantId: string,
        data: {
            name: string;
            level: number;
            description: string;
            permissionIds?: string[];
        },
    ): Promise<Role> {
        const scopedPermissionIds = await this.resolvePermissionIds(
            prisma,
            tenantId,
            data.permissionIds ?? [],
        );
        const role = await prisma.role.create({
            data: {
                name: data.name,
                level: data.level,
                description: data.description,
                active: true,
                tenantId,
                permissions: scopedPermissionIds.length
                    ? {
                          create: scopedPermissionIds.map((permissionId) => ({
                              permission: { connect: { id: permissionId } },
                          })),
                      }
                    : undefined,
            },
            include: { permissions: { include: { permission: true } } },
        });
        return this.mapToEntity(role);
    }

    async assignPermission(
        tenantId: string | undefined,
        roleId: string,
        permissionId: string,
    ): Promise<void> {
        // The role is resolved in the acting tenant's scope rather than by id
        // alone: `assignPermission` writes into the authorization table, so an
        // unverified roleId would attach the permission to another tenant's
        // role — or to a global one, which every tenant can see.
        const where: Prisma.RoleWhereInput = {
            id: roleId,
            ...this.buildTenantWhere(tenantId),
        };
        const existingRole = await prisma.role.findFirst({ where });

        if (!existingRole) {
            throw new EntityNotFoundError("Role", roleId);
        }

        await this.resolvePermissionIds(prisma, tenantId, [permissionId]);

        await prisma.rolePermission.create({
            data: { roleId, permissionId },
        });
    }
}
