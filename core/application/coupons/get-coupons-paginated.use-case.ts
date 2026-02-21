import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetCouponsPaginatedUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string | undefined, options: {
        search?: string;
        type?: string;
        status?: 'active' | 'expired' | 'used' | 'unused' | 'all';
        page?: number;
        limit?: number;
    }): Promise<UseCaseResult> {
        const page = options.page || 1;
        const limit = options.limit || 10;

        const result = await this.couponRepository.findAllPaginated(tenantId, {
            search: options.search,
            type: options.type,
            status: options.status || 'all',
            page,
            limit
        });

        return Success(result.coupons, 'Coupons retrieved successfully');
    }
}
