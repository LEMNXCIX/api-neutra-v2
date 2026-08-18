import { Feature } from "../entities/feature.entity";

export interface FeatureCreateData {
    key: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}

export interface IFeatureRepository {
    findAll(): Promise<Feature[]>;
    findById(id: string): Promise<Feature | null>;
    findByKey(key: string): Promise<Feature | null>;
    create(data: FeatureCreateData): Promise<Feature>;
    update(id: string, data: Partial<Feature>): Promise<Feature>;
    delete(id: string): Promise<void>;
    getTenantFeatureStatus(tenantId: string): Promise<Record<string, boolean>>;
    updateTenantFeatures(
        tenantId: string,
        features: Record<string, boolean>,
    ): Promise<void>;
    findEnabledFeatureKeysByTenantId(tenantId: string): Promise<string[]>;
}
