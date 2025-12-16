import { prisma } from '@/config/db.config';
import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { Permission, CreatePermissionDTO, UpdatePermissionDTO } from '@/core/entities/permission.entity';

export class PrismaPermissionRepository implements IPermissionRepository {
    async findAll(): Promise<Permission[]> {
        const permissions = await prisma.permission.findMany({
            orderBy: { name: 'asc' }
        });
        return permissions;
    }

    async findAllPaginated(page: number, limit: number, search?: string): Promise<{ permissions: Permission[]; total: number }> {
        const skip = (page - 1) * limit;
        const where = search ? {
            name: { contains: search, mode: 'insensitive' as const }
        } : {};

        const [permissions, total] = await Promise.all([
            prisma.permission.findMany({
                where,
                skip,
                take: limit,
                orderBy: { name: 'asc' }
            }),
            prisma.permission.count({ where })
        ]);

        return {
            permissions,
            total
        };
    }

    async findById(id: string): Promise<Permission | null> {
        const permission = await prisma.permission.findUnique({
            where: { id }
        });
        return permission;
    }

    async findByName(name: string): Promise<Permission | null> {
        const permission = await prisma.permission.findUnique({
            where: { name }
        });
        return permission;
    }

    async create(data: CreatePermissionDTO): Promise<Permission> {
        const permission = await prisma.permission.create({
            data
        });
        return permission;
    }

    async update(id: string, data: UpdatePermissionDTO): Promise<Permission> {
        const permission = await prisma.permission.update({
            where: { id },
            data
        });
        return permission;
    }

    async delete(id: string): Promise<void> {
        await prisma.permission.delete({
            where: { id }
        });
    }
}
