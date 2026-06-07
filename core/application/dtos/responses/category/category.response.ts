import { Category, CategoryType } from "@/core/entities/category.entity";

export interface ICategoryResponse {
    id: string;
    name: string;
    description?: string | null;
    type: CategoryType;
    active: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class CategoryResponse {
    static fromEntity(category: Category): ICategoryResponse {
        return {
            id: category.id,
            name: category.name,
            description: category.description ?? null,
            type: category.type,
            active: category.active,
            tenantId: category.tenantId,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
        };
    }
}
