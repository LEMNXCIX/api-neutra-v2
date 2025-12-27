export interface Feature {
    id: string;
    key: string;
    name: string;
    description?: string;
    category?: string;
    price: number;
    createdAt?: Date;
}

export interface CreateFeatureDTO {
    key: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}
