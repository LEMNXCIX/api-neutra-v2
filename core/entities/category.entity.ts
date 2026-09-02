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
    tenant?: { id: string; name: string; slug: string };
    productCount?: number;
    createdAt: Date;
    updatedAt: Date;
}
