import { Product, CreateProductDTO, UpdateProductDTO } from '../entities/product.entity';

export interface IProductRepository {
    findAll(): Promise<Product[]>;
    findById(id: string): Promise<Product | null>;
    create(product: CreateProductDTO): Promise<Product>;
    update(id: string, product: UpdateProductDTO): Promise<Product>;
    delete(id: string): Promise<Product>;
    searchByName(name: string): Promise<Product[]>;
    getStats(): Promise<any[]>; // Define specific stats type if needed
    findFirst(where: Partial<Product>): Promise<Product | null>; // Helper for ownership check
}
