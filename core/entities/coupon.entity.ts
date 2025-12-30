// Coupon Entity and DTOs

export enum CouponType {
    PERCENT = 'PERCENT',
    FIXED = 'FIXED'
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

export interface CouponValidationResult {
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    message?: string;
}
