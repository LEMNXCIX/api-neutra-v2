import { Service as PrismaService, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IServiceRepository,
    ServiceCreateData,
    ServiceUpdateData,
} from "@/core/repositories/service.repository.interface";
import { Service } from "@/core/entities/service.entity";
import { Category } from "@/core/entities/category.entity";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

type ServiceWithCategory = Prisma.ServiceGetPayload<{
    include: { category: true };
}>;

export class PrismaServiceRepository implements IServiceRepository {
    private mapToEntity(service: ServiceWithCategory): Service {
        return {
            id: service.id,
            name: service.name,
            description: service.description ?? undefined,
            duration: service.duration,
            price: service.price,
            categoryId: service.categoryId ?? undefined,
            category: service.category
                ? {
                      id: service.category.id,
                      name: service.category.name,
                      description: service.category.description,
                      type: service.category.type as Category["type"],
                      active: service.category.active,
                      tenantId: service.category.tenantId,
                      createdAt: service.category.createdAt,
                      updatedAt: service.category.updatedAt,
                  }
                : undefined,
            active: service.active,
            tenantId: service.tenantId,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
        };
    }

    async create(tenantId: string, data: ServiceCreateData): Promise<Service> {
        try {
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
                include: { category: true },
            });
            return this.mapToEntity(service);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError("Service", target, data.name);
            }
            throw error;
        }
    }

    async findById(tenantId: string, id: string): Promise<Service | null> {
        const service = await prisma.service.findFirst({
            where: { id, tenantId },
            include: { category: true },
        });
        return service ? this.mapToEntity(service) : null;
    }

    async findAll(
        tenantId: string | undefined,
        activeOnly: boolean = false,
    ): Promise<Service[]> {
        const where: Prisma.ServiceWhereInput = {
            ...(tenantId && { tenantId }),
            ...(activeOnly && { active: true }),
        };

        const services = await prisma.service.findMany({
            where,
            include: { category: true },
            orderBy: { name: "asc" },
        });
        return services.map((s) => this.mapToEntity(s));
    }

    async findByCategoryId(
        tenantId: string,
        categoryId: string,
    ): Promise<Service[]> {
        const services = await prisma.service.findMany({
            where: { tenantId, categoryId, active: true },
            include: { category: true },
            orderBy: { name: "asc" },
        });
        return services.map((s) => this.mapToEntity(s));
    }

    async update(
        tenantId: string,
        id: string,
        data: ServiceUpdateData,
    ): Promise<Service> {
        try {
            const service = await prisma.service.update({
                where: { id, tenantId },
                data: {
                    name: data.name,
                    description: data.description,
                    duration: data.duration,
                    price: data.price,
                    categoryId: data.categoryId,
                    active: data.active,
                },
                include: { category: true },
            });
            return this.mapToEntity(service);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Service", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError(
                    "Service",
                    target,
                    data.name ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.service.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Service", id);
            }
            throw error;
        }
    }
}
