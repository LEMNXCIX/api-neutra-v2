export enum TenantType {
    STORE = "STORE",
    BOOKING = "BOOKING",
    HYBRID = "HYBRID",
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
    features?: Record<string, boolean>;
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
        updatedAt: Date,
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

    isBookingType(): boolean {
        return (
            this.type === TenantType.BOOKING || this.type === TenantType.HYBRID
        );
    }

    isStoreType(): boolean {
        return (
            this.type === TenantType.STORE || this.type === TenantType.HYBRID
        );
    }

    isFeatureEnabled(featureKey: string): boolean {
        return this.config?.features?.[featureKey] === true;
    }
}
