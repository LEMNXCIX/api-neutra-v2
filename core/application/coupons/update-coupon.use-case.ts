import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { UpdateCouponDTO } from '@/core/entities/coupon.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string, id: string, data: UpdateCouponDTO): Promise<UseCaseResult> {
        const existingCoupon = await this.couponRepository.findById(tenantId, id);

        if (!existingCoupon) {
            throw new AppError('Coupon not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const updatedCoupon = await this.couponRepository.update(tenantId, id, data);
        return Success(updatedCoupon, 'Coupon updated successfully');
    }
}
