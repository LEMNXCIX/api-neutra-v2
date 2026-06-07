import {
    Tenant,
    TenantType,
    TenantConfig,
} from "@/core/entities/tenant.entity";

export interface ITenantResponse {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export class TenantResponse {
    static fromEntity(tenant: Tenant): ITenantResponse {
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
