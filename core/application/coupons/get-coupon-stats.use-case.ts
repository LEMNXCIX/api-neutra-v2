import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';

export class GetCouponStatsUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute() {
        try {
            const stats = await this.couponRepository.getStats();
            return {
                success: true,
                code: 200,
                message: 'Coupon stats retrieved successfully',
                data: stats
            };
        } catch (error: any) {
            console.error('Error getting coupon stats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
}
