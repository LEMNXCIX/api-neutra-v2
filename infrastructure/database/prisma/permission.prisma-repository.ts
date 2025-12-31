import { prisma } from '@/config/db.config';
import { IPermissionRepository } from '@/core/repositories/permission.repository.interface';
import { Permission, CreatePermissionDTO, UpdatePermissionDTO } from '@/core/entities/permission.entity';

export class PrismaPermissionRepository implements IPermissionRepository {
    async findAll(tenantId: string | undefined): Promise<Permission[]> {
        const where: any = {};
        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const permissions = await prisma.permission.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        return permissions;
    }

    async findAllPaginated(tenantId: string | undefined, page: number, limit: number, search?: string): Promise<{ permissions: Permission[]; total: number }> {
        const skip = (page - 1) * limit;
        const where: any = {};

        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        if (search) {
            where.name = { contains: search, mode: 'insensitive' as const };
        }

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

    async findById(tenantId: string | undefined, id: string): Promise<Permission | null> {
        const permission = await prisma.permission.findUnique({
            where: { id }
        });

        // Verify visibility
        if (permission && tenantId && permission.tenantId !== tenantId && permission.tenantId !== null) {
            return null;
        }
        return permission;
    }

    async findByName(tenantId: string | undefined, name: string): Promise<Permission | null> {
        const where: any = { name };
        if (tenantId) {
            where.OR = [
                { tenantId },
                { tenantId: null }
            ];
        }

        const permission = await prisma.permission.findFirst({
            where
        });
        return permission;
    }

    async create(tenantId: string | undefined, data: CreatePermissionDTO): Promise<Permission> {
        const permission = await prisma.permission.create({
            data: {
                ...data,
                tenantId: tenantId || null
            }
        });
        return permission;
    }

    async update(tenantId: string | undefined, id: string, data: UpdatePermissionDTO): Promise<Permission> {
        // Verify ownership/visibility
        const existing = await this.findById(tenantId, id);
        if (!existing) throw new Error('Permission not found or access denied');

        const permission = await prisma.permission.update({
            where: { id },
            data
        });
        return permission;
    }

    async delete(tenantId: string | undefined, id: string): Promise<void> {
        // Verify ownership/visibility
        const existing = await this.findById(tenantId, id);
        if (!existing) throw new Error('Permission not found or access denied');

        await prisma.permission.delete({
            where: { id }
        });
    }
}
