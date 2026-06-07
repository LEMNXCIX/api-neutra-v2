import { Role as PrismaRole, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IRoleRepository } from "@/core/repositories/role.repository.interface";
import { Role } from "@/core/entities/role.entity";
import { Permission } from "@/core/entities/permission.entity";
import {
    CreateRoleDTO,
    UpdateRoleDTO,
} from "@/core/application/dtos/requests/role.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
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
        data: CreateRoleDTO,
    ): Promise<Role> {
        try {
            const { permissionIds, ...roleData } = data;
            const role = await prisma.role.create({
                data: {
                    name: roleData.name,
                    description: roleData.description,
                    level: roleData.level,
                    active: roleData.active,
                    tenantId: tenantId || null,
                    permissions: permissionIds
                        ? {
                              create: permissionIds.map((permissionId) => ({
                                  permission: { connect: { id: permissionId } },
                              })),
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
        data: UpdateRoleDTO,
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

                if (permissionIds.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissionIds.map((permissionId) => ({
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
            permissionIds: string[];
        },
    ): Promise<Role> {
        const role = await prisma.role.create({
            data: {
                name: data.name,
                level: data.level,
                description: data.description,
                active: true,
                tenantId,
                permissions: {
                    create: data.permissionIds.map((permissionId) => ({
                        permission: { connect: { id: permissionId } },
                    })),
                },
            },
            include: { permissions: { include: { permission: true } } },
        });
        return this.mapToEntity(role);
    }

    async assignPermission(
        roleId: string,
        permissionId: string,
    ): Promise<void> {
        await prisma.rolePermission.create({
            data: { roleId, permissionId },
        });
    }
}
