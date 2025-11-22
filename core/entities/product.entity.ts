export interface Product {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    ownerId: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CreateProductDTO {
    name: string;
    description: string;
    image: string;
    price: number;
    ownerId: string;
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    image?: string;
    price?: number;
}
