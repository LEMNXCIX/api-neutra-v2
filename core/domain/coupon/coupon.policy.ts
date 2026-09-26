import { Coupon, CouponType } from "@/core/entities/coupon.entity";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";

export function isPersonalCoupon(
    coupon: { ownerId?: string | null },
): boolean {
    return coupon.ownerId !== undefined && coupon.ownerId !== null;
}

export function isCouponOwnedBy(
    coupon: { ownerId?: string | null },
    userId?: string,
): boolean {
    return !isPersonalCoupon(coupon) || coupon.ownerId === userId;
}

export function isRewardCoupon(
    coupon: Pick<Coupon, "isReward">,
): boolean {
    return coupon.isReward === true;
}

export function isLoyaltyTemplateCoupon(
    coupon: Pick<Coupon, "isLoyaltyTemplate">,
): boolean {
    return coupon.isLoyaltyTemplate === true;
}

export function isExpired(coupon: Pick<Coupon, "expiresAt">): boolean {
    return new Date() > coupon.expiresAt;
}

export function hasReachedUsageLimit(
    coupon: Pick<Coupon, "usageCount" | "usageLimit">,
): boolean {
    const { usageLimit } = coupon;
    // "Unlimited" reaches the domain as null (Prisma) or undefined (optional
    // field). Both must short-circuit: `usageCount >= null` coerces to
    // `usageCount >= 0` and would falsely reject every unlimited coupon.
    if (usageLimit === null || usageLimit === undefined) return false;
    return coupon.usageCount >= usageLimit;
}

/** The coupon fields the redemption guard reads. */
export type RedeemableCoupon = {
    ownerId?: string | null;
    isReward?: boolean;
    isLoyaltyTemplate?: boolean;
    active: boolean;
    expiresAt: Date;
    usageCount: number;
    usageLimit?: number;
};

/** A coupon as stored: absent optionals are `null` instead of `undefined`. */
type StoredCoupon = Omit<RedeemableCoupon, "usageLimit"> & {
    usageLimit?: number | null;
};

export function toRedeemableCoupon(
    coupon: StoredCoupon,
): RedeemableCoupon {
    return { ...coupon, usageLimit: coupon.usageLimit ?? undefined };
}

/**
 * Single source of truth for coupon redemption eligibility.
 * Callers must run it inside their own transaction: in-transaction
 * revalidation is what prevents stale awards and double-spend.
 */
export function assertCouponRedeemable(
    coupon: RedeemableCoupon,
    userId?: string,
): void {
    if (isLoyaltyTemplateCoupon(coupon)) {
        throw new BusinessRuleViolationError(
            "Loyalty reward templates cannot be redeemed",
            "LOYALTY_TEMPLATE_NOT_REDEEMABLE",
        );
    }
    if (!isCouponOwnedBy(coupon, userId)) {
        throw new BusinessRuleViolationError(
            "Coupon is not available for this user",
            "COUPON_NOT_OWNED",
        );
    }
    if (isRewardCoupon(coupon) && !isPersonalCoupon(coupon)) {
        throw new BusinessRuleViolationError(
            "Reward coupon is not assigned to a customer",
            "REWARD_COUPON_NOT_OWNED",
        );
    }
    if (!coupon.active) {
        throw new BusinessRuleViolationError("Coupon is not active");
    }
    if (isExpired(coupon)) {
        throw new BusinessRuleViolationError("Coupon has expired");
    }
    if (hasReachedUsageLimit(coupon)) {
        throw new BusinessRuleViolationError("Coupon usage limit reached");
    }
}

/**
 * Coupon availability depends on the tenant having COUPONS enabled. Callers pass
 * their own evidence: a feature map, or a matching tenantFeature row read inside
 * their own transaction.
 */
export function assertCouponsFeatureEnabled(
    enabled: boolean | null | undefined,
): void {
    if (!enabled) {
        throw new BusinessRuleViolationError(
            "Coupon validation is not available for this tenant",
            "COUPONS_FEATURE_REQUIRED",
        );
    }
}

export function isApplicableToProduct(
    coupon: Pick<Coupon, "applicableProducts">,
    productId: string,
): boolean {
    if (coupon.applicableProducts.length === 0) return true;
    return coupon.applicableProducts.includes(productId);
}

export function isApplicableToCategory(
    coupon: Pick<Coupon, "applicableCategories">,
    categoryId: string,
): boolean {
    if (coupon.applicableCategories.length === 0) return true;
    return coupon.applicableCategories.includes(categoryId);
}

export function calculateDiscount(coupon: Coupon, subtotal: number): number {
    const { minPurchaseAmount, maxDiscountAmount } = coupon;
    if (
        minPurchaseAmount !== undefined &&
        minPurchaseAmount !== null &&
        subtotal < minPurchaseAmount
    )
        return 0;

    let discount: number;
    if (coupon.type === CouponType.PERCENT) {
        discount = subtotal * (coupon.value / 100);
    } else {
        discount = coupon.value;
    }

    if (
        maxDiscountAmount !== undefined &&
        maxDiscountAmount !== null &&
        discount > maxDiscountAmount
    ) {
        discount = maxDiscountAmount;
    }

    return Math.min(discount, subtotal);
}
