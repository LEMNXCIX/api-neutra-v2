import { Tenant as PrismaTenant, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import {
    Tenant,
    TenantType,
    TenantConfig,
} from "@/core/entities/tenant.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

/**
 * Prisma's TenantType and the domain enum are declared separately (core/ may
 * not import @prisma/client), so the mapper has to prove the row value is a
 * real member before narrowing it. A row that drifts out of the enum is a
 * schema/domain disagreement and must surface, not be silently relabelled.
 */
function isTenantType(value: string): value is TenantType {
    return (Object.values(TenantType) as string[]).includes(value);
}

function toTenantType(value: string): TenantType {
    if (!isTenantType(value)) {
        throw new Error(`Unsupported tenant type: ${value}`);
    }
    return value;
}

export class TenantPrismaRepository implements ITenantRepository {
    private prisma = prisma;

    constructor() {}

    private toEntity(data: PrismaTenant): Tenant {
        return {
            id: data.id,
            name: data.name,
            slug: data.slug,
            type: toTenantType(data.type),
            active: data.active,
            config: (data.config as TenantConfig | null) ?? {},
            createdById: data.createdById,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
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
            orderBy: { createdAt: "desc" },
        });
        return tenants.map((t) => this.toEntity(t));
    }

    async findCreatedByUserId(userId: string): Promise<Tenant[]> {
        const tenants = await this.prisma.tenant.findMany({
            where: { createdById: userId },
            orderBy: { createdAt: "desc" },
        });
        return tenants.map((t) => this.toEntity(t));
    }

    async create(data: Partial<Tenant>): Promise<Tenant> {
        try {
            const tenant = await this.prisma.tenant.create({
                data: {
                    name: data.name!,
                    slug: data.slug!,
                    type: data.type || TenantType.STORE,
                    config: (data.config || {}) as Prisma.InputJsonValue,
                    active: data.active ?? true,
                    createdById: data.createdById ?? null,
                },
            });
            return this.toEntity(tenant);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "slug";
                throw new DuplicateEntityError(
                    "Tenant",
                    target,
                    data.slug ?? "",
                );
            }
            throw error;
        }
    }

    async update(id: string, data: Partial<Tenant>): Promise<Tenant> {
        const updateData: Prisma.TenantUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.slug !== undefined) updateData.slug = data.slug;
        if (data.type !== undefined) updateData.type = data.type;
        if (data.config !== undefined)
            updateData.config = data.config as Prisma.InputJsonValue;
        if (data.active !== undefined) updateData.active = data.active;

        try {
            const tenant = await this.prisma.tenant.update({
                where: { id },
                data: updateData,
            });
            return this.toEntity(tenant);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Tenant", id);
            }
            throw error;
        }
    }

    async delete(id: string): Promise<void> {
        try {
            await this.prisma.tenant.delete({
                where: { id },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Tenant", id);
            }
            throw error;
        }
    }
}
