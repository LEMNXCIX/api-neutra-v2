import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { UpdateCouponDTO } from '@/core/entities/coupon.entity';

export class UpdateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(id: string, data: UpdateCouponDTO) {
        try {
            const existingCoupon = await this.couponRepository.findById(id);

            if (!existingCoupon) {
                return {
                    success: false,
                    code: 404,
                    message: 'Coupon not found',
                    data: null
                };
            }

            const updatedCoupon = await this.couponRepository.update(id, data);

            return {
                success: true,
                code: 200,
                message: 'Coupon updated successfully',
                data: updatedCoupon
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to update coupon',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
