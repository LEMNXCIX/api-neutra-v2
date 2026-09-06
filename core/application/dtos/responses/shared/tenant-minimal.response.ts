export interface ITenantMinimalResponse {
    id: string;
    name: string;
    slug: string;
}

export class TenantMinimalResponse {
    static fromEntity(tenant: {
        id: string;
        name: string;
        slug: string;
    }): ITenantMinimalResponse {
        return {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
        };
    }
}
