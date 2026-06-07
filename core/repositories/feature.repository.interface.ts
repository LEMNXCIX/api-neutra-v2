import { Feature } from "../entities/feature.entity";
import { CreateFeatureDTO } from "@/core/application/dtos/requests/feature.request";

export interface IFeatureRepository {
    findAll(): Promise<Feature[]>;
    findById(id: string): Promise<Feature | null>;
    findByKey(key: string): Promise<Feature | null>;
    create(data: CreateFeatureDTO): Promise<Feature>;
    update(id: string, data: Partial<Feature>): Promise<Feature>;
    delete(id: string): Promise<void>;
    getTenantFeatureStatus(tenantId: string): Promise<Record<string, boolean>>;
    updateTenantFeatures(
        tenantId: string,
        features: Record<string, boolean>,
    ): Promise<void>;
    findEnabledFeatureKeysByTenantId(tenantId: string): Promise<string[]>;
}
