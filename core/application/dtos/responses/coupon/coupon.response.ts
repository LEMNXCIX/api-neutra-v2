import { Coupon, CouponType } from "@/core/entities/coupon.entity";

export interface ICouponResponse {
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

export class CouponResponse {
    static fromEntity(coupon: Coupon): ICouponResponse {
        return {
            id: coupon.id,
            code: coupon.code,
            type: coupon.type,
            value: coupon.value,
            description: coupon.description,
            minPurchaseAmount: coupon.minPurchaseAmount,
            maxDiscountAmount: coupon.maxDiscountAmount,
            usageLimit: coupon.usageLimit,
            usageCount: coupon.usageCount,
            active: coupon.active,
            expiresAt: coupon.expiresAt,
            applicableProducts: coupon.applicableProducts,
            applicableCategories: coupon.applicableCategories,
            applicableServices: coupon.applicableServices,
            createdAt: coupon.createdAt,
            updatedAt: coupon.updatedAt,
        };
    }
}
