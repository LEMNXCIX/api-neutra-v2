import { Service } from "@/core/entities/service.entity";

export type ServiceCreateData = {
    name: string;
    description?: string;
    duration: number;
    price: number;
    categoryId?: string;
    active?: boolean;
};

export type ServiceUpdateData = {
    name?: string;
    description?: string;
    duration?: number;
    price?: number;
    categoryId?: string;
    active?: boolean;
};

/**
 * Service Repository Interface
 * Defines operations for Service persistence
 */
export interface IServiceRepository {
    create(tenantId: string, data: ServiceCreateData): Promise<Service>;
    findById(tenantId: string, id: string): Promise<Service | null>;
    findAll(
        tenantId: string | undefined,
        activeOnly?: boolean,
    ): Promise<Service[]>;
    findByCategoryId(tenantId: string, categoryId: string): Promise<Service[]>;
    update(
        tenantId: string,
        id: string,
        data: ServiceUpdateData,
    ): Promise<Service>;
    delete(tenantId: string, id: string): Promise<void>;
}
