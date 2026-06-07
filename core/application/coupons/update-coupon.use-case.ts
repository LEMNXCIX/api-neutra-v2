import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { UpdateCouponDTO } from "@/core/application/dtos/requests/coupon.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class UpdateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateCouponDTO,
    ): Promise<UseCaseResult> {
        const existingCoupon = await this.couponRepository.findById(
            tenantId,
            id,
        );

        if (!existingCoupon) {
            throw new EntityNotFoundError("Coupon", id);
        }

        const updatedCoupon = await this.couponRepository.update(
            tenantId,
            id,
            data,
        );
        return Success(updatedCoupon, "Coupon updated successfully");
    }
}
