import { Coupon } from "@/core/entities/coupon.entity";
import {
    CouponResponse,
    ICouponResponse,
} from "@/core/application/dtos/responses/coupon/coupon.response";

export class CouponPresenter {
    static toResponse(coupon: Coupon): ICouponResponse {
        return CouponResponse.fromEntity(coupon);
    }

    static toResponseList(coupons: Coupon[]): ICouponResponse[] {
        if (!Array.isArray(coupons)) return [];
        return coupons.map((c) => CouponResponse.fromEntity(c));
    }
}
