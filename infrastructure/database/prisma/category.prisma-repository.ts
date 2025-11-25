import { prisma } from '@/config/db.config';
import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/core/entities/category.entity';

export class PrismaCategoryRepository implements ICategoryRepository {
    async findAll(): Promise<Category[]> {
        const categories = await prisma.category.findMany({
            orderBy: { name: 'asc' }
        });
        return categories;
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
}
