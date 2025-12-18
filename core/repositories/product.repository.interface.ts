import { Product, CreateProductDTO, UpdateProductDTO } from '@/core/entities/product.entity';

/**
 * Product Repository Interface - Tenant-Scoped
 * All operations are scoped to a specific tenant for data isolation
 */
export interface IProductRepository {
    findAll(tenantId: string, options?: { categoryId?: string }): Promise<Product[]>;
    findById(tenantId: string, id: string): Promise<Product | null>;
    create(tenantId: string, product: CreateProductDTO): Promise<Product>;
    update(tenantId: string, id: string, product: UpdateProductDTO): Promise<Product>;
    delete(tenantId: string, id: string): Promise<Product>;
    searchByName(tenantId: string, name: string): Promise<Product[]>;
    getStats(tenantId: string): Promise<any[]>;
    getSummaryStats(tenantId: string): Promise<{ totalProducts: number; totalValue: number; lowStockCount: number; outOfStockCount: number }>;
    findFirst(tenantId: string, where: Partial<Product>): Promise<Product | null>;
}
