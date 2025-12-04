export interface Product {
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
    categories?: any[]; // Using any[] for now to avoid circular dependency with Category entity
}

export interface CreateProductDTO {
    name: string;
    description: string;
    image?: string;
    price: number;
    stock?: number;
    active?: boolean;
    ownerId: string;
    categoryIds?: string[];
}

export interface UpdateProductDTO {
    name?: string;
    description?: string;
    image?: string;
    price?: number;
    stock?: number;
    active?: boolean;
    categoryIds?: string[];
}
