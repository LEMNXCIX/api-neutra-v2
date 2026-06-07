import { Coupon } from "@/core/entities/coupon.entity";

export interface CouponValidationResult {
    valid: boolean;
    coupon?: Coupon;
    discountAmount?: number;
    message?: string;
}
