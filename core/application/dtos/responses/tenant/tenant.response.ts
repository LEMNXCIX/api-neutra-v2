export enum TenantType {
    STORE = "STORE",
    BOOKING = "BOOKING",
    HYBRID = "HYBRID",
}

export interface ITenantConfig {
    branding?: Record<string, any>;
    settings?: Record<string, any>;
    features?: Record<string, any>;
}

export interface ITenantResponse {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    config?: ITenantConfig;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class TenantResponse {
    static fromEntity(tenant: any): ITenantResponse {
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            type: tenant.type,
            config: tenant.config,
            active: tenant.active,
            createdAt: tenant.createdAt,
            updatedAt: tenant.updatedAt,
        };
    }
}
