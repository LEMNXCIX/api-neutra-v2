import { type Coupon, CouponType } from "@/core/entities/coupon.entity";

/**
 * The coupon columns the mapper reads, and nothing else.
 *
 * Structural on purpose: the Prisma-generated row and the loyalty
 * repository's local record both satisfy it without either of them
 * reshaping its own type, so one mapper can own the mapping.
 */
export type CouponRow = {
    id: string;
    code: string;
    type: string;
    value: number;
    description: string | null;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    active: boolean;
    expiresAt: Date;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
    ownerId: string | null;
    isReward: boolean;
    isLoyaltyTemplate: boolean;
    sourceCouponId: string | null;
    createdAt: Date;
    updatedAt: Date;
};

export function toCouponType(value: string): CouponType {
    if (value === CouponType.PERCENT || value === CouponType.FIXED) {
        return value;
    }
    throw new Error(`Unsupported coupon type: ${value}`);
}

/**
 * Single source of truth for coupon row -> domain entity.
 *
 * Every nullable column is assigned straight through: a stored row
 * always has the field, and the field may be null. `isReward` and
 * `isLoyaltyTemplate` are declared non-null with a schema default, so
 * a `?? false` here would only hide a broken row.
 */
export function mapCoupon(row: CouponRow): Coupon {
    return {
        id: row.id,
        code: row.code,
        type: toCouponType(row.type),
        value: row.value,
        description: row.description,
        minPurchaseAmount: row.minPurchaseAmount,
        maxDiscountAmount: row.maxDiscountAmount,
        usageLimit: row.usageLimit,
        usageCount: row.usageCount,
        active: row.active,
        expiresAt: row.expiresAt,
        applicableProducts: row.applicableProducts,
        applicableCategories: row.applicableCategories,
        applicableServices: row.applicableServices,
        ownerId: row.ownerId,
        isReward: row.isReward,
        isLoyaltyTemplate: row.isLoyaltyTemplate,
        sourceCouponId: row.sourceCouponId,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
    };
}
