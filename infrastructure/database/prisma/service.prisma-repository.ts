import { prisma } from '@/config/db.config';
import { IServiceRepository } from '@/core/repositories/service.repository.interface';
import { Service, CreateServiceDTO, UpdateServiceDTO } from '@/core/entities/service.entity';

/**
 * Prisma Service Repository
 * Tenant-aware implementation for Service persistence
 */
export class PrismaServiceRepository implements IServiceRepository {
    async create(tenantId: string, data: CreateServiceDTO): Promise<Service> {
        const service = await prisma.service.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                duration: data.duration,
                price: data.price,
                categoryId: data.categoryId,
                active: data.active ?? true,
            },
            include: { category: true }
        });
        return this.mapToEntity(service);
    }

    async findById(tenantId: string, id: string): Promise<Service | null> {
        const service = await prisma.service.findFirst({
            where: { id, tenantId },
            include: { category: true }
        });
        return service ? this.mapToEntity(service) : null;
    }

    async findAll(tenantId: string | undefined, activeOnly: boolean = false): Promise<Service[]> {
        const services = await prisma.service.findMany({
            where: {
                ...(tenantId && { tenantId }),
                ...(activeOnly && { active: true }),
            },
            include: { category: true },
            orderBy: { name: 'asc' },
        });
        return services.map(this.mapToEntity);
    }

    async findByCategoryId(tenantId: string, categoryId: string): Promise<Service[]> {
        const services = await prisma.service.findMany({
            where: {
                tenantId,
                categoryId,
                active: true,
            },
            include: { category: true },
            orderBy: { name: 'asc' },
        });
        return services.map(this.mapToEntity);
    }

    async update(tenantId: string, id: string, data: UpdateServiceDTO): Promise<Service> {
        const service = await prisma.service.update({
            where: {
                id,
                tenantId,
            },
            data: {
                name: data.name,
                description: data.description,
                duration: data.duration,
                price: data.price,
                categoryId: data.categoryId,
                active: data.active,
            },
            include: { category: true }
        });
        return this.mapToEntity(service);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.service.delete({
            where: { id, tenantId },
        });
    }

    private mapToEntity(service: any): Service {
        return {
            id: service.id,
            name: service.name,
            description: service.description,
            duration: service.duration,
            price: service.price,
            categoryId: service.categoryId,
            category: service.category ? {
                id: service.category.id,
                name: service.category.name,
                description: service.category.description,
                type: service.category.type,
                active: service.category.active,
                tenantId: service.category.tenantId,
                createdAt: service.category.createdAt,
                updatedAt: service.category.updatedAt,
            } : undefined,
            active: service.active,
            tenantId: service.tenantId,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
        };
    }
}
