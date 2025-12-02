import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';

export class DeleteCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(id: string) {
        try {
            const coupon = await this.couponRepository.findById(id);

            if (!coupon) {
                return {
                    success: false,
                    code: 404,
                    message: 'Coupon not found',
                    data: null
                };
            }

            await this.couponRepository.delete(id);

            return {
                success: true,
                code: 200,
                message: 'Coupon deleted successfully',
                data: null
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to delete coupon',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
