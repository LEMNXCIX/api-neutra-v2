export interface CreateFeatureDTO {
    key: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}

export interface UpdateFeatureDTO {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
}
