export interface ICategoryMinimalResponse {
    id: string;
    name: string;
}

export interface IServiceResponse {
    id: string;
    name: string;
    description?: string;
    duration: number;
    price: number;
    categoryId?: string;
    category?: ICategoryMinimalResponse;
    active: boolean;
    tenantId: string;
    createdAt: Date;
    updatedAt: Date;
}

export class ServiceResponse {
    static fromEntity(service: any): IServiceResponse {
        return {
            id: service.id,
            name: service.name,
            description: service.description,
            duration: service.duration,
            price: service.price,
            categoryId: service.categoryId,
            category: service.category
                ? { id: service.category.id, name: service.category.name }
                : undefined,
            active: service.active,
            tenantId: service.tenantId,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
        };
    }
}
