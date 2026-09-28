import type { Feature } from "../entities/feature.entity";

export interface FeatureCreateData {
    key: string;
    name: string;
    description?: string;
    category?: string;
    price?: number;
}

interface FeatureUpdateData {
    name?: string;
    description?: string;
    category?: string;
    price?: number;
}

export interface IFeatureRepository {
    findAll(): Promise<Feature[]>;
    findById(id: string): Promise<Feature | null>;
    findByKey(key: string): Promise<Feature | null>;
    create(data: FeatureCreateData): Promise<Feature>;
    /**
     * `FeatureUpdateData`, not `Partial<Feature>`: `key` is the join key that
     * every `TenantFeature` row and every stored `config.features` map is
     * written by, and `UpdateFeatureDTO` never declared it either. The port
     * previously widened the payload to the whole entity, which let a `key` or
     * an `id` reach a global catalog write from any caller — and made
     * `UpdateFeatureDTO` a compile-time ghost, imported by nothing. A field
     * missing from the request DTO is the definition of not accepted here.
     */
    update(id: string, data: FeatureUpdateData): Promise<Feature>;
    delete(id: string): Promise<void>;
    getTenantFeatureStatus(tenantId: string): Promise<Record<string, boolean>>;
    updateTenantFeatures(
        tenantId: string,
        features: Record<string, boolean>,
    ): Promise<void>;
    findEnabledFeatureKeysByTenantId(tenantId: string): Promise<string[]>;
}
