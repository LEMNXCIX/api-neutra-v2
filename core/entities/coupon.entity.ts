export enum CouponType {
    PERCENT = "PERCENT",
    FIXED = "FIXED",
}

export interface Coupon {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    description?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    usageCount: number;
    active: boolean;
    expiresAt: Date;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
    createdAt: Date;
    updatedAt: Date;
}

export function isExpired(coupon: Coupon): boolean {
    return new Date() > coupon.expiresAt;
}

export function hasReachedUsageLimit(coupon: Coupon): boolean {
    if (coupon.usageLimit === undefined) return false;
    return coupon.usageCount >= coupon.usageLimit;
}

export function isApplicableToProduct(
    coupon: Coupon,
    productId: string,
): boolean {
    if (coupon.applicableProducts.length === 0) return true;
    return coupon.applicableProducts.includes(productId);
}

export function isApplicableToCategory(
    coupon: Coupon,
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
