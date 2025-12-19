import { Service, CreateServiceDTO, UpdateServiceDTO } from '@/core/entities/service.entity';

/**
 * Service Repository Interface
 * Defines operations for Service persistence
 */
export interface IServiceRepository {
    create(tenantId: string, data: CreateServiceDTO): Promise<Service>;
    findById(tenantId: string, id: string): Promise<Service | null>;
    findAll(tenantId: string, activeOnly?: boolean): Promise<Service[]>;
    findByCategoryId(tenantId: string, categoryId: string): Promise<Service[]>;
    update(tenantId: string, id: string, data: UpdateServiceDTO): Promise<Service>;
    delete(tenantId: string, id: string): Promise<void>;
}
