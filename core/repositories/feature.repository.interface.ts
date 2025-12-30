import { Feature, CreateFeatureDTO } from '../entities/feature.entity';

export interface IFeatureRepository {
    findAll(): Promise<Feature[]>;
    findById(id: string): Promise<Feature | null>;
    findByKey(key: string): Promise<Feature | null>;
    create(data: CreateFeatureDTO): Promise<Feature>;
    update(id: string, data: Partial<Feature>): Promise<Feature>;
    delete(id: string): Promise<void>;
    getTenantFeatureStatus(tenantId: string): Promise<Record<string, boolean>>;
    updateTenantFeatures(tenantId: string, features: Record<string, boolean>): Promise<void>;
}
