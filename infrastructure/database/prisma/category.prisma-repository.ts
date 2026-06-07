import { Category as PrismaCategory, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { Category, CategoryType } from "@/core/entities/category.entity";
import {
    CreateCategoryDTO,
    UpdateCategoryDTO,
} from "@/core/application/dtos/requests/category.request";
import {
    DuplicateEntityError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";

export class PrismaCategoryRepository implements ICategoryRepository {
    private mapToEntity(
        category: PrismaCategory & { _count?: { products: number } },
    ): Category {
        return {
            id: category.id,
            name: category.name,
            description: category.description,
            type: category.type as CategoryType,
            active: category.active,
            tenantId: category.tenantId,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            productCount: category._count?.products,
        } as Category;
    }

    async findAll(
        tenantId: string | undefined,
        page?: number,
        limit?: number,
        type?: CategoryType,
    ): Promise<{ categories: Category[]; total: number }> {
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit;
        const where: { tenantId?: string; type?: CategoryType } = {
            ...(tenantId && { tenantId }),
            ...(type && { type }),
        };

        const [categories, total] = await Promise.all([
            prisma.category.findMany({
                where,
                orderBy: { name: "asc" },
                skip,
                take,
                include: {
                    _count: {
                        select: { products: true },
                    },
                },
            }),
            prisma.category.count({ where }),
        ]);

        return {
            categories: categories.map((cat) => this.mapToEntity(cat)),
            total,
        };
    }

    async findById(tenantId: string, id: string): Promise<Category | null> {
        const category = await prisma.category.findFirst({
            where: { id, tenantId },
        });
        return category ? this.mapToEntity(category) : null;
    }

    async findByName(
        tenantId: string,
        name: string,
        type?: CategoryType,
    ): Promise<Category | null> {
        const where: { name: string; tenantId: string; type?: CategoryType } = {
            name,
            tenantId,
            ...(type && { type }),
        };
        const category = await prisma.category.findFirst({ where });
        return category ? this.mapToEntity(category) : null;
    }

    async create(tenantId: string, data: CreateCategoryDTO): Promise<Category> {
        try {
            const category = await prisma.category.create({
                data: {
                    name: data.name,
                    description: data.description,
                    type: data.type || CategoryType.PRODUCT,
                    active: data.active ?? true,
                    tenantId,
                },
            });
            return this.mapToEntity(category);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError("Category", target, data.name);
            }
            throw error;
        }
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateCategoryDTO,
    ): Promise<Category> {
        try {
            const category = await prisma.category.update({
                where: { id, tenantId },
                data,
            });
            return this.mapToEntity(category);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Category", id);
            }
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                const target = (error.meta?.target as string[])?.[0] ?? "name";
                throw new DuplicateEntityError(
                    "Category",
                    target,
                    data.name ?? "",
                );
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<void> {
        try {
            await prisma.category.delete({
                where: { id, tenantId },
            });
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Category", id);
            }
            throw error;
        }
    }

    async getStats(
        tenantId: string | undefined,
    ): Promise<{ totalCategories: number; avgProductsPerCategory: number }> {
        const where = { ...(tenantId && { tenantId }) };
        const totalCategories = await prisma.category.count({ where });

        const categoriesWithProducts = await prisma.category.findMany({
            where,
            select: {
                _count: {
                    select: { products: true },
                },
            },
        });

        const totalProducts = categoriesWithProducts.reduce(
            (sum, cat) => sum + cat._count.products,
            0,
        );
        const avgProductsPerCategory =
            totalCategories > 0 ? totalProducts / totalCategories : 0;

        return {
            totalCategories,
            avgProductsPerCategory,
        };
    }
}
