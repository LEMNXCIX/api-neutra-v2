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
                category: data.category,
                active: data.active ?? true,
            },
        });
        return this.mapToEntity(service);
    }

    async findById(tenantId: string, id: string): Promise<Service | null> {
        const service = await prisma.service.findFirst({
            where: { id, tenantId },
        });
        return service ? this.mapToEntity(service) : null;
    }

    async findAll(tenantId: string, activeOnly: boolean = false): Promise<Service[]> {
        const services = await prisma.service.findMany({
            where: {
                tenantId,
                ...(activeOnly && { active: true }),
            },
            orderBy: { name: 'asc' },
        });
        return services.map(this.mapToEntity);
    }

    async findByCategory(tenantId: string, category: string): Promise<Service[]> {
        const services = await prisma.service.findMany({
            where: {
                tenantId,
                category,
                active: true,
            },
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
                category: data.category,
                active: data.active,
            },
        });
        return this.mapToEntity(service);
    }

    async delete(tenantId: string, id: string): Promise<void> {
        // Soft delete by setting active to false
        await prisma.service.update({
            where: { id, tenantId },
            data: { active: false },
        });
    }

    private mapToEntity(service: any): Service {
        return {
            id: service.id,
            name: service.name,
            description: service.description,
            duration: service.duration,
            price: service.price,
            category: service.category,
            active: service.active,
            tenantId: service.tenantId,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
        };
    }
}
