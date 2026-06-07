import { Product } from "@/core/entities/product.entity";

export interface IProductResponse {
    id: string;
    name: string;
    description: string;
    image: string | null;
    price: number;
    stock: number;
    active: boolean;
    ownerId: string;
    createdAt?: Date;
    updatedAt?: Date;
    categories?: Array<{ id: string; name: string }>;
}

export class ProductResponse {
    static fromEntity(product: Product): IProductResponse {
        return {
            id: product.id,
            name: product.name,
            description: product.description,
            image: product.image ?? null,
            price: product.price,
            stock: product.stock,
            active: product.active,
            ownerId: product.ownerId,
            createdAt: product.createdAt,
            updatedAt: product.updatedAt,
            categories: product.categories,
        };
    }
}
