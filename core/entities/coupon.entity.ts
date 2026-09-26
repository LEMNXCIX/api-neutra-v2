export enum CouponType {
    PERCENT = "PERCENT",
    FIXED = "FIXED",
}

export interface Coupon {
    id: string;
    code: string;
    type: CouponType;
    value: number;
    description: string | null;
    ownerId: string | null;
    isReward?: boolean;
    isLoyaltyTemplate?: boolean;
    sourceCouponId: string | null;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    usageLimit: number | null;
    usageCount: number;
    active: boolean;
    expiresAt: Date;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
    createdAt: Date;
    updatedAt: Date;
}

