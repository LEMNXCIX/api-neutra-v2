import { Product } from "@/core/entities/product.entity";

export type CreateProductData = {
    name: string;
    description: string;
    image?: string;
    price: number;
    stock?: number;
    active?: boolean;
    ownerId: string;
    categoryIds?: string[];
};

export type UpdateProductData = {
    name?: string;
    description?: string;
    image?: string;
    price?: number;
    stock?: number;
    active?: boolean;
    categoryIds?: string[];
};

/**
 * Product Repository Interface - Tenant-Scoped
 * All operations are scoped to a specific tenant for data isolation
 */
export interface IProductRepository {
    findAll(
        tenantId: string | undefined,
        options?: { categoryId?: string },
    ): Promise<Product[]>;
    findById(tenantId: string | undefined, id: string): Promise<Product | null>;
    create(tenantId: string, data: CreateProductData): Promise<Product>;
    update(
        tenantId: string,
        id: string,
        data: UpdateProductData,
    ): Promise<Product>;
    delete(tenantId: string, id: string): Promise<Product>;
    searchByName(tenantId: string, name: string): Promise<Product[]>;
    getStats(
        tenantId: string | undefined,
    ): Promise<{ _id: string; total: number }[]>;
    getSummaryStats(tenantId: string | undefined): Promise<{
        totalProducts: number;
        totalValue: number;
        lowStockCount: number;
        outOfStockCount: number;
    }>;
    findFirst(
        tenantId: string,
        where: Partial<Product>,
    ): Promise<Product | null>;
}
