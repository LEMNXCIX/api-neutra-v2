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
        businessHours?: import("@/core/domain/booking/working-hours").WorkingHours;
        holidays?: string[]; // "YYYY-MM-DD"
    };
    features?: Record<string, boolean>;
}

/**
 * Tenant behaviour lives in `core/domain/tenant/tenant.policy.ts`; an entity
 * module holds types only. Read a tenant's type with `isBookingType` and
 * `isStoreType` there, not by comparing `type` inline.
 */
export interface Tenant {
    id: string;
    name: string;
    slug: string;
    type: TenantType;
    config?: TenantConfig;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}
