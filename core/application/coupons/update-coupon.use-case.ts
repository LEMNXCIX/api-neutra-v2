import type { UpdateCouponDTO } from "@/core/application/dtos/requests/coupon.request";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type {
    ICouponRepository,
    UpdateCouponData,
} from "@/core/repositories/coupon.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

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

        const updateData: UpdateCouponData = { ...data };
        const updatedCoupon = await this.couponRepository.update(
            tenantId,
            id,
            updateData,
        );
        return Success(updatedCoupon, "Coupon updated successfully");
    }
}
