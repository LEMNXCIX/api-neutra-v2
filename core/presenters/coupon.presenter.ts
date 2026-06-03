import {
    CouponResponse,
    ICouponResponse,
} from "@/core/application/dtos/responses/coupon/coupon.response";

export class CouponPresenter {
    static toResponse(coupon: any): ICouponResponse {
        return CouponResponse.fromEntity(coupon);
    }

    static toResponseList(coupons: any[]): ICouponResponse[] {
        return coupons.map((c) => CouponResponse.fromEntity(c));
    }
}
