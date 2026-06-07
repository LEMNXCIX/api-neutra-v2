import { TenantType, TenantConfig } from "@/core/entities/tenant.entity";

export interface CreateTenantDTO {
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
}

export interface UpdateTenantDTO {
    name?: string;
    slug?: string;
    type?: TenantType;
    config?: Partial<TenantConfig>;
    active?: boolean;
}

export interface UpdateTenantFeaturesDTO {
    features: Record<string, boolean>;
}
