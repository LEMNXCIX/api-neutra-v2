import { CouponType } from "@/core/entities/coupon.entity";

export interface CreateCouponDTO {
    code: string;
    type: CouponType;
    value: number;
    description?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    active?: boolean;
    expiresAt: Date | string;
    applicableProducts?: string[];
    applicableCategories?: string[];
    applicableServices?: string[];
}

export interface UpdateCouponDTO {
    code?: string;
    type?: CouponType;
    value?: number;
    description?: string;
    minPurchaseAmount?: number;
    maxDiscountAmount?: number;
    usageLimit?: number;
    active?: boolean;
    expiresAt?: Date | string;
    applicableProducts?: string[];
    applicableCategories?: string[];
}

export interface ValidateCouponDTO {
    code: string;
    orderTotal: number;
    productIds?: string[];
    categoryIds?: string[];
    serviceIds?: string[];
}
