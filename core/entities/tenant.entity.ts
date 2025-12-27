
export enum TenantType {
    STORE = 'STORE',
    BOOKING = 'BOOKING',
    HYBRID = 'HYBRID'
}

export interface TenantConfig {
    branding?: {
        primaryColor?: string;
        tenantLogo?: string;
        favicon?: string;
    };
    settings?: {
        supportEmail?: string;
        websiteUrl?: string;
        currency?: string;
        language?: string;
        timezone?: string;
    };
    features?: Record<string, any>;
}

export class Tenant {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(
        id: string,
        name: string,
        slug: string,
        type: TenantType,
        active: boolean,
        config: TenantConfig | undefined,
        createdAt: Date,
        updatedAt: Date
    ) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.type = type;
        this.active = active;
        this.config = config;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
