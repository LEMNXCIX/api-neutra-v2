export interface CreateServiceDTO {
    name: string;
    description?: string;
    duration: number;
    price: number;
    categoryId?: string;
    active?: boolean;
}

export interface UpdateServiceDTO {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    categoryId?: string;
    active?: boolean;
}
