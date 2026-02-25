import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeleteCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findById(tenantId, id);

        if (!coupon) {
            throw new AppError('Coupon not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.couponRepository.delete(tenantId, id);
        return Success(null, 'Coupon deleted successfully');
    }
}
