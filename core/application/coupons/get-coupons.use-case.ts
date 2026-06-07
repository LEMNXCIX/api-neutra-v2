import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetCouponsUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(
        tenantId: string | undefined,
        activeOnly: boolean = false,
    ): Promise<UseCaseResult> {
        const coupons = activeOnly
            ? await this.couponRepository.findActive(tenantId)
            : await this.couponRepository.findAll(tenantId);

        return Success(coupons, "Coupons retrieved successfully");
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findById(tenantId, id);

        if (!coupon) {
            throw new EntityNotFoundError("Coupon", id);
        }

        return Success(coupon, "Coupon retrieved successfully");
    }

    async executeByCode(
        tenantId: string,
        code: string,
    ): Promise<UseCaseResult> {
        const coupon = await this.couponRepository.findByCode(tenantId, code);

        if (!coupon) {
            throw new EntityNotFoundError("Coupon", code);
        }

        return Success(coupon, "Coupon retrieved successfully");
    }
}
