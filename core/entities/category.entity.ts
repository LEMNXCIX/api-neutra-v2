export interface Category {
    id: string;
    name: string;
    description?: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateCategoryDTO {
    name: string;
    description?: string;
    active?: boolean;
}

export interface UpdateCategoryDTO {
    name?: string;
    description?: string;
    active?: boolean;
}
