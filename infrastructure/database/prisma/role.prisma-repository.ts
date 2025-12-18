import { prisma } from '@/config/db.config';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Role, CreateRoleDTO, UpdateRoleDTO } from '@/core/entities/role.entity';

export class PrismaRoleRepository implements IRoleRepository {
    async findAll(tenantId: string | undefined): Promise<Role[]> {
        const where: any = {};
        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const roles = await prisma.role.findMany({
            where,
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            },
            orderBy: { level: 'asc' }
        });
        return roles.map(this.mapToEntity);
    }

    async findAllPaginated(tenantId: string | undefined, page: number, limit: number, search?: string): Promise<{ roles: Role[]; total: number }> {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const [roles, total] = await Promise.all([
            prisma.role.findMany({
                where,
                skip,
                take: limit,
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                },
                orderBy: { level: 'asc' }
            }),
            prisma.role.count({ where })
        ]);

        return {
            roles: roles.map(this.mapToEntity),
            total
        };
    }

    async findById(tenantId: string | undefined, id: string): Promise<Role | null> {
        const where: any = { id };

        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const role = await prisma.role.findFirst({
            where,
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        return role ? this.mapToEntity(role) : null;
    }

    async findByName(tenantId: string | undefined, name: string): Promise<Role | null> {
        const where: any = { name };

        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const role = await prisma.role.findFirst({
            where,
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        return role ? this.mapToEntity(role) : null;
    }

    async create(tenantId: string | undefined, data: CreateRoleDTO): Promise<Role> {
        const { permissionIds, ...roleData } = data;
        const role = await prisma.role.create({
            data: {
                ...roleData,
                tenantId: tenantId || null, // Global roles have null tenantId
                permissions: permissionIds ? {
                    create: permissionIds.map(permissionId => ({
                        permission: { connect: { id: permissionId } }
                    }))
                } : undefined
            },
            include: {
                permissions: {
                    include: {
                        permission: true
                    }
                }
            }
        });
        return this.mapToEntity(role);
    }

    async update(tenantId: string | undefined, id: string, data: UpdateRoleDTO): Promise<Role> {
        const { permissionIds, ...roleData } = data;

        // Verify role existence and visibility
        const where: any = { id };
        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const existingRole = await prisma.role.findFirst({
            where
        });

        if (!existingRole) {
            throw new Error(`Role not found or cannot be modified`);
        }

        if (permissionIds) {
            return await prisma.$transaction(async (tx) => {
                // Update role basic info
                await tx.role.update({
                    where: { id },
                    data: roleData
                });

                // Delete existing permissions
                await tx.rolePermission.deleteMany({
                    where: { roleId: id }
                });

                // Create new permissions
                if (permissionIds.length > 0) {
                    await tx.rolePermission.createMany({
                        data: permissionIds.map(permissionId => ({
                            roleId: id,
                            permissionId
                        }))
                    });
                }

                // Return updated role
                const updatedRole = await tx.role.findUnique({
                    where: { id },
                    include: {
                        permissions: {
                            include: {
                                permission: true
                            }
                        }
                    }
                });
                return this.mapToEntity(updatedRole!);
            });
        } else {
            const role = await prisma.role.update({
                where: { id },
                data: roleData,
                include: {
                    permissions: {
                        include: {
                            permission: true
                        }
                    }
                }
            });
            return this.mapToEntity(role);
        }
    }

    async delete(tenantId: string | undefined, id: string): Promise<void> {
        const where: any = { id };
        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const existingRole = await prisma.role.findFirst({
            where
        });

        if (!existingRole) {
            throw new Error(`Role not found or cannot be deleted`);
        }

        await prisma.role.delete({
            where: { id }
        });
    }

    private mapToEntity(prismaRole: any): Role {
        return {
            id: prismaRole.id,
            name: prismaRole.name,
            description: prismaRole.description,
            level: prismaRole.level,
            active: prismaRole.active,
            permissions: prismaRole.permissions?.map((rp: any) => rp.permission) || [],
            createdAt: prismaRole.createdAt,
            updatedAt: prismaRole.updatedAt
        };
    }
}
