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

export interface SearchProductDTO {
    name: string;
}
