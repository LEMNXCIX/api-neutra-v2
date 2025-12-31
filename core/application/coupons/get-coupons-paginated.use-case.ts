import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';

export class GetCouponsPaginatedUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string | undefined, options: {
        search?: string;
        type?: string;
        status?: 'active' | 'expired' | 'used' | 'unused' | 'all';
        page?: number;
        limit?: number;
    }) {
        try {
            const page = options.page || 1;
            const limit = options.limit || 10;

            const result = await this.couponRepository.findAllPaginated(tenantId, {
                search: options.search,
                type: options.type,
                status: options.status || 'all',
                page,
                limit
            });

            const totalPages = Math.ceil(result.total / limit);

            return {
                success: true,
                code: 200,
                message: 'Coupons retrieved successfully',
                data: result.coupons,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages
                }
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
}
