
import { Tenant } from '../entities/tenant.entity';

export interface ITenantRepository {
    findById(id: string): Promise<Tenant | null>;
    findBySlug(slug: string): Promise<Tenant | null>;
    findAll(): Promise<Tenant[]>;
    create(data: Partial<Tenant>): Promise<Tenant>;
    update(id: string, data: Partial<Tenant>): Promise<Tenant>;
    delete(id: string): Promise<void>;
}
