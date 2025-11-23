import { prisma } from '@/config/db.config';
import { IRoleRepository } from '@/core/repositories/role.repository.interface';
import { Role, CreateRoleDTO, UpdateRoleDTO } from '@/core/entities/role.entity';

export class PrismaRoleRepository implements IRoleRepository {
    async findAll(): Promise<Role[]> {
        const roles = await prisma.role.findMany({
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

    async findById(id: string): Promise<Role | null> {
        const role = await prisma.role.findUnique({
            where: { id },
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

    async findByName(name: string): Promise<Role | null> {
        const role = await prisma.role.findUnique({
            where: { name },
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

    async create(data: CreateRoleDTO): Promise<Role> {
        const { permissionIds, ...roleData } = data;
        const role = await prisma.role.create({
            data: {
                ...roleData,
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

    async update(id: string, data: UpdateRoleDTO): Promise<Role> {
        const { permissionIds, ...roleData } = data;

        // If permissionIds provided, we need to handle the relation update
        // The simplest way for many-to-many with explicit join table in Prisma is deleteMany then create
        // Or using transaction. For simplicity here, we'll use a transaction if permissions are updated.

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

    async delete(id: string): Promise<void> {
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
            permissions: prismaRole.permissions?.map((rp: any) => rp.permission) || [],
            createdAt: prismaRole.createdAt,
            updatedAt: prismaRole.updatedAt
        };
    }
}
