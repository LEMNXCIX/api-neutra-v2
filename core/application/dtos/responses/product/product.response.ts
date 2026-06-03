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
    categories?: any[];
}

export class ProductResponse {
    static fromEntity(product: any): IProductResponse {
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
