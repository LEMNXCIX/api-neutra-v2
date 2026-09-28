import { type Tenant, TenantType } from "@/core/entities/tenant.entity";

/** HYBRID satisfies both capabilities, so it is true for both predicates. */
export function isBookingType(tenant: Pick<Tenant, "type">): boolean {
    return (
        tenant.type === TenantType.BOOKING || tenant.type === TenantType.HYBRID
    );
}

export function isStoreType(tenant: Pick<Tenant, "type">): boolean {
    return (
        tenant.type === TenantType.STORE || tenant.type === TenantType.HYBRID
    );
}

/** Only an explicit `true` enables a feature; absent or falsy does not. */
export function isFeatureEnabled(
    tenant: Pick<Tenant, "config">,
    featureKey: string,
): boolean {
    return tenant.config?.features?.[featureKey] === true;
}
