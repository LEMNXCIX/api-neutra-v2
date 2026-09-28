import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class DeleteCouponUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findById(tenantId, id);

        if (!coupon) {
            throw new EntityNotFoundError("Coupon", id);
        }

        await this.couponRepository.delete(tenantId, id);
        return Success(null, "Coupon deleted successfully");
    }
}
