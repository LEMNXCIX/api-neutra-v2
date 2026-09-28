/**
 * Plan and entitlement decisions for a tenant. The policy decides; the caller
 * renders the 403 body. `code` and `message` are part of the HTTP contract and
 * must stay byte-identical.
 */

import { TenantErrorCodes } from "@/types/error-codes";

export type TenantGateDecision =
    | { allowed: true }
    | { allowed: false; code: string; message: string };

export function evaluateFeatureEnabled(params: {
    featureKey: string;
    enabled: boolean;
}): TenantGateDecision {
    if (params.enabled) return { allowed: true };
    return {
        allowed: false,
        code: TenantErrorCodes.FEATURE_NOT_ENABLED,
        message: `The ${params.featureKey} feature is not enabled for this tenant.`,
    };
}

export function evaluateTenantActive(params: {
    active: boolean;
}): TenantGateDecision {
    if (params.active) return { allowed: true };
    return {
        allowed: false,
        code: TenantErrorCodes.TENANT_INACTIVE,
        message: "Tenant is inactive.",
    };
}

export function evaluateTenantType(params: {
    type: string | undefined;
    allowed: readonly string[];
}): TenantGateDecision {
    if (params.type && params.allowed.includes(params.type)) {
        return { allowed: true };
    }
    return {
        allowed: false,
        code: TenantErrorCodes.TYPE_NOT_ALLOWED,
        message: `Requires tenant type: ${params.allowed.join(" or ")}.`,
    };
}
