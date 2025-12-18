import { prisma } from '@/config/db.config';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/core/entities/category.entity';

/**
 * Tenant-Aware Category Repository
 */
export class PrismaCategoryRepository implements ICategoryRepository {
    async findAll(tenantId: string, page?: number, limit?: number): Promise<{ categories: Category[]; total: number }> {
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit;
        const where = { tenantId };

        const [categories, total] = await Promise.all([
            prisma.category.findMany({
                where,
                orderBy: { name: 'asc' },
                skip,
                take,
                include: {
                    _count: {
                        select: { products: true }
                    }
                }
            }),
            prisma.category.count({ where })
        ]);

        return {
            categories: categories.map(cat => ({
                ...cat,
                productCount: cat._count.products
            } as any)),
            total
        };
    }

    async findById(tenantId: string, id: string): Promise<Category | null> {
        const category = await prisma.category.findFirst({
            where: { id, tenantId }
        });
        return category;
    }

    async findByName(tenantId: string, name: string): Promise<Category | null> {
        const category = await prisma.category.findFirst({
            where: { name, tenantId }
        });
        return category;
    }

    async create(tenantId: string, data: CreateCategoryDTO): Promise<Category> {
        const category = await prisma.category.create({
            data: {
                ...data,
                tenantId
            }
        });
        return category;
    }

    async update(tenantId: string, id: string, data: UpdateCategoryDTO): Promise<Category> {
        const category = await prisma.category.update({
            where: {
                id,
                tenantId
            },
            data
        });
        return category;
    }

    async delete(tenantId: string, id: string): Promise<void> {
        await prisma.category.delete({
            where: {
                id,
                tenantId
            }
        });
    }

    async getStats(tenantId: string): Promise<{ totalCategories: number; avgProductsPerCategory: number }> {
        const where = { tenantId };
        const totalCategories = await prisma.category.count({ where });

        // Get product counts per category
        const categoriesWithProducts = await prisma.category.findMany({
            where,
            select: {
                _count: {
                    select: {
                        products: true
                    }
                }
            }
        });

        const totalProducts = categoriesWithProducts.reduce(
            (sum, cat) => sum + cat._count.products,
            0
        );
        const avgProductsPerCategory = totalCategories > 0 ? totalProducts / totalCategories : 0;

        return {
            totalCategories,
            avgProductsPerCategory
        };
    }
}
