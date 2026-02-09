export enum CategoryType {
    PRODUCT = "PRODUCT",
    SERVICE = "SERVICE",
}

export interface Category {
    id: string;
    name: string;
    description?: string | null;
    type: CategoryType;
    active: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

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
