
import { PrismaClient, Tenant as PrismaTenant } from '@prisma/client';
import { ITenantRepository } from '@/core/repositories/tenant.repository.interface';
import { Tenant, TenantType } from '@/core/entities/tenant.entity';

export class TenantPrismaRepository implements ITenantRepository {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    private toEntity(data: PrismaTenant): Tenant {
        return new Tenant(
            data.id,
            data.name,
            data.slug,
            data.type as TenantType,
            data.active,
            data.config || {},
            data.createdAt,
            data.updatedAt
        );
    }

    async findById(id: string): Promise<Tenant | null> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
        });
        return tenant ? this.toEntity(tenant) : null;
    }

    async findBySlug(slug: string): Promise<Tenant | null> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { slug },
        });
        return tenant ? this.toEntity(tenant) : null;
    }

    async findAll(): Promise<Tenant[]> {
        const tenants = await this.prisma.tenant.findMany({
            orderBy: { createdAt: 'desc' },
        });
        return tenants.map(this.toEntity);
    }

    async create(data: Partial<Tenant>): Promise<Tenant> {
        const tenant = await this.prisma.tenant.create({
            data: {
                name: data.name!,
                slug: data.slug!,
                type: data.type || TenantType.STORE,
                config: data.config || {},
                active: data.active ?? true,
            },
        });
        return this.toEntity(tenant);
    }

    async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
        const tenant = await this.prisma.tenant.update({
            where: { id },
            data: {
                name: data.name,
                slug: data.slug,
                type: data.type,
                config: data.config,
                active: data.active,
            },
        });
        return this.toEntity(tenant);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.tenant.delete({
            where: { id },
        });
    }
}
