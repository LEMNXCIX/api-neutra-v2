import { CategoryType } from "@/core/entities/category.entity";

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    type?: CategoryType;
    active?: boolean;
}
