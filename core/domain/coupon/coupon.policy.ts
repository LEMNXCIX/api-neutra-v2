import { Coupon, CouponType } from "@/core/entities/coupon.entity";

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
    if (coupon.usageLimit === undefined) return false;
    return coupon.usageCount >= coupon.usageLimit;
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
    if (
        coupon.minPurchaseAmount !== undefined &&
        subtotal < coupon.minPurchaseAmount
    )
        return 0;

    let discount: number;
    if (coupon.type === CouponType.PERCENT) {
        discount = subtotal * (coupon.value / 100);
    } else {
        discount = coupon.value;
    }

    if (
        coupon.maxDiscountAmount !== undefined &&
        discount > coupon.maxDiscountAmount
    ) {
        discount = coupon.maxDiscountAmount;
    }

    return Math.min(discount, subtotal);
}
