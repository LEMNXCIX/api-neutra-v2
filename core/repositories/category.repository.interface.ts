import { Category, CreateCategoryDTO, UpdateCategoryDTO } from '@/core/entities/category.entity';

export interface ICategoryRepository {
    findAll(page?: number, limit?: number): Promise<{ categories: Category[]; total: number }>;
    findById(id: string): Promise<Category | null>;
    findByName(name: string): Promise<Category | null>;
    create(data: CreateCategoryDTO): Promise<Category>;
    update(id: string, data: UpdateCategoryDTO): Promise<Category>;
    delete(id: string): Promise<void>;
    getStats(): Promise<{ totalCategories: number; avgProductsPerCategory: number }>;
}
