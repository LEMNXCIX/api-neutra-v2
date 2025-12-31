import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';

export class GetCouponsUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string | undefined, activeOnly: boolean = false) {
        try {
            const coupons = activeOnly
                ? await this.couponRepository.findActive(tenantId)
                : await this.couponRepository.findAll(tenantId);

            return {
                success: true,
                code: 200,
                message: 'Coupons retrieved successfully',
                data: coupons
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve coupons',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }

    async executeById(tenantId: string, id: string) {
        try {
            const coupon = await this.couponRepository.findById(tenantId, id);

            if (!coupon) {
                return {
                    success: false,
                    code: 404,
                    message: 'Coupon not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Coupon retrieved successfully',
                data: coupon
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve coupon',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }

    async executeByCode(tenantId: string, code: string) {
        try {
            const coupon = await this.couponRepository.findByCode(tenantId, code);

            if (!coupon) {
                return {
                    success: false,
                    code: 404,
                    message: 'Coupon not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Coupon retrieved successfully',
                data: coupon
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve coupon',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
