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
    ownerId?: string;
    isReward?: boolean;
    isLoyaltyTemplate?: boolean;
    sourceCouponId?: string;
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

