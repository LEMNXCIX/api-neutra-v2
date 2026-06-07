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
    productCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
