import { Category, CreateCategoryDTO, UpdateCategoryDTO, CategoryType } from '@/core/entities/category.entity';

/**
 * Category Repository Interface - Tenant-Scoped
 */
export interface ICategoryRepository {
    findAll(tenantId: string | undefined, page?: number, limit?: number, type?: CategoryType): Promise<{ categories: Category[]; total: number }>;
    findById(tenantId: string, id: string): Promise<Category | null>;
    findByName(tenantId: string, name: string, type?: CategoryType): Promise<Category | null>;
    create(tenantId: string, data: CreateCategoryDTO): Promise<Category>;
    update(tenantId: string, id: string, data: UpdateCategoryDTO): Promise<Category>;
    delete(tenantId: string, id: string): Promise<void>;
    getStats(tenantId: string): Promise<{ totalCategories: number; avgProductsPerCategory: number }>;
}
