import {
    ICouponRepository,
    CreateCouponData,
} from "@/core/repositories/coupon.repository.interface";
import { CreateCouponDTO } from "@/core/application/dtos/requests/coupon.request";
import { CouponType } from "@/core/entities/coupon.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    ValidationError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class CreateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(
        tenantId: string,
        data: CreateCouponDTO,
    ): Promise<UseCaseResult> {
        if (!data.code || data.code.trim().length < 3) {
            throw new ValidationError(
                "Coupon code must be at least 3 characters",
            );
        }

        if (
            data.type === CouponType.PERCENT &&
            (data.value <= 0 || data.value > 100)
        ) {
            throw new ValidationError(
                "Percentage discount must be between 0 and 100",
            );
        }

        if (data.type === CouponType.FIXED && data.value <= 0) {
            throw new ValidationError("Fixed discount must be greater than 0");
        }

        if (!data.expiresAt) {
            throw new ValidationError("Expiration date is required");
        }

        const expirationDate = new Date(data.expiresAt);
        if (isNaN(expirationDate.getTime())) {
            throw new ValidationError("Invalid expiration date format");
        }

        if (expirationDate <= new Date()) {
            throw new ValidationError("Expiration date must be in the future");
        }

        const existingCoupon = await this.couponRepository.findByCode(
            tenantId,
            data.code,
        );
        if (existingCoupon) {
            throw new DuplicateEntityError("Coupon", "code", data.code);
        }

        const couponData: CreateCouponData = { ...data };
        const coupon = await this.couponRepository.create(tenantId, couponData);
        return Success(coupon, "Coupon created successfully");
    }
}
