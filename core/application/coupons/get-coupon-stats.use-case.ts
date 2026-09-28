import type { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetCouponStatsUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.couponRepository.getStats(tenantId);
        return Success(stats, "Coupon stats retrieved successfully");
    }
}
