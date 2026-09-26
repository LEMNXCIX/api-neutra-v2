import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";

export function assertTenantFeatureDependencies(
    features: Record<string, boolean>,
): void {
    if (features.LOYALTY === true && features.COUPONS !== true) {
        throw new BusinessRuleViolationError(
            "LOYALTY requires COUPONS to be enabled",
            "LOYALTY_REQUIRES_COUPONS",
        );
    }
}

export function isLoyaltyOrCouponsDisabling(
    current: Record<string, boolean>,
    changes: Record<string, boolean>,
): boolean {
    return (
        (current.LOYALTY === true && changes.LOYALTY === false) ||
        (current.COUPONS === true && changes.COUPONS === false)
    );
}
