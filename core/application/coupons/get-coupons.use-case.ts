import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetCouponsUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string | undefined, activeOnly: boolean = false): Promise<UseCaseResult> {
        const coupons = activeOnly
            ? await this.couponRepository.findActive(tenantId)
            : await this.couponRepository.findAll(tenantId);

        return Success(coupons, 'Coupons retrieved successfully');
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findById(tenantId, id);

        if (!coupon) {
            throw new AppError('Coupon not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        return Success(coupon, 'Coupon retrieved successfully');
    }

    async executeByCode(tenantId: string, code: string): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findByCode(tenantId, code);

        if (!coupon) {
            throw new AppError('Coupon not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        return Success(coupon, 'Coupon retrieved successfully');
    }
}
