import { Service } from "@/core/entities/service.entity";
import {
    CreateServiceDTO,
    UpdateServiceDTO,
} from "@/core/application/dtos/requests/service.request";

/**
 * Service Repository Interface
 * Defines operations for Service persistence
 */
export interface IServiceRepository {
    create(tenantId: string, data: CreateServiceDTO): Promise<Service>;
    findById(tenantId: string, id: string): Promise<Service | null>;
    findAll(
        tenantId: string | undefined,
        activeOnly?: boolean,
    ): Promise<Service[]>;
    findByCategoryId(tenantId: string, categoryId: string): Promise<Service[]>;
    update(
        tenantId: string,
        id: string,
        data: UpdateServiceDTO,
    ): Promise<Service>;
    delete(tenantId: string, id: string): Promise<void>;
}
