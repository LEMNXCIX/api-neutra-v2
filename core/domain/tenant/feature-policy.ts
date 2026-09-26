/**
 * Plan and entitlement decisions for a tenant. The policy decides; the caller
 * renders the 403 body. `code` and `message` are part of the HTTP contract and
 * must stay byte-identical.
 */

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
        code: "FEATURE_NOT_ENABLED",
        message: `The ${params.featureKey} feature is not enabled for this tenant.`,
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
        code: "TENANT_TYPE_NOT_ALLOWED",
        message: `Requires tenant type: ${params.allowed.join(" or ")}.`,
    };
}
