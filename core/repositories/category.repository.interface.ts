import { Category, CategoryType } from "@/core/entities/category.entity";

export type CategoryCreateData = {
    name: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
};

export type CategoryUpdateData = {
    name?: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
};

/**
 * Category Repository Interface - Tenant-Scoped
 */
export interface ICategoryRepository {
    findAll(
        tenantId: string | undefined,
        page?: number,
        limit?: number,
        type?: CategoryType,
    ): Promise<{ categories: Category[]; total: number }>;
    findById(tenantId: string, id: string): Promise<Category | null>;
    findByName(
        tenantId: string,
        name: string,
        type?: CategoryType,
    ): Promise<Category | null>;
    create(tenantId: string, data: CategoryCreateData): Promise<Category>;
    update(
        tenantId: string,
        id: string,
        data: CategoryUpdateData,
    ): Promise<Category>;
    delete(tenantId: string, id: string): Promise<void>;
    getStats(
        tenantId: string | undefined,
    ): Promise<{ totalCategories: number; avgProductsPerCategory: number }>;
}
