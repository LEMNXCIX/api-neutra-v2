import { prisma } from '@/config/db.config';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/core/entities/category.entity';

export class PrismaCategoryRepository implements ICategoryRepository {
    async findAll(page?: number, limit?: number): Promise<{ categories: Category[]; total: number }> {
        const skip = page && limit ? (page - 1) * limit : undefined;
        const take = limit;

        const [categories, total] = await Promise.all([
            prisma.category.findMany({
                orderBy: { name: 'asc' },
                skip,
                take,
                include: {
                    _count: {
                        select: { products: true }
                    }
                }
            }),
            prisma.category.count()
        ]);

        return {
            categories: categories.map(cat => ({
                ...cat,
                productCount: cat._count.products
            } as any)),
            total
        };
    }

    async findById(id: string): Promise<Category | null> {
        const category = await prisma.category.findUnique({
            where: { id }
        });
        return category;
    }

    async findByName(name: string): Promise<Category | null> {
        const category = await prisma.category.findUnique({
            where: { name }
        });
        return category;
    }

    async create(data: CreateCategoryDTO): Promise<Category> {
        const category = await prisma.category.create({
            data
        });
        return category;
    }

    async update(id: string, data: UpdateCategoryDTO): Promise<Category> {
        const category = await prisma.category.update({
            where: { id },
            data
        });
        return category;
    }

    async delete(id: string): Promise<void> {
        await prisma.category.delete({
            where: { id }
        });
    }

    async getStats(): Promise<{ totalCategories: number; avgProductsPerCategory: number }> {
        const totalCategories = await prisma.category.count();

        // Get product counts per category
        const categoriesWithProducts = await prisma.category.findMany({
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
