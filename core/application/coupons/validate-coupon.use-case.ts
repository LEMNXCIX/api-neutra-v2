import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { ValidateCouponDTO } from "@/core/application/dtos/requests/coupon.request";
import { CouponValidationResult } from "@/core/application/dtos/responses/coupon/coupon-validation.response";
import {
    CouponType,
    isExpired,
    hasReachedUsageLimit,
    isApplicableToProduct,
    isApplicableToCategory,
    calculateDiscount,
} from "@/core/entities/coupon.entity";
import {
    EntityNotFoundError,
    BusinessRuleViolationError,
} from "@/core/domain/errors/domain-errors";
import { UseCaseResult, Success } from "@/core/utils/use-case-result";

export class ValidateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) {}

    async execute(
        tenantId: string,
        data: ValidateCouponDTO,
    ): Promise<UseCaseResult<CouponValidationResult>> {
        const coupon = await this.couponRepository.findByCode(
            tenantId,
            data.code,
        );

        if (!coupon) {
            throw new EntityNotFoundError("Coupon", data.code);
        }

        if (!coupon.active) {
            throw new BusinessRuleViolationError("Coupon is not active");
        }

        if (isExpired(coupon)) {
            throw new BusinessRuleViolationError("Coupon has expired");
        }

        if (hasReachedUsageLimit(coupon)) {
            throw new BusinessRuleViolationError("Coupon usage limit reached");
        }

        if (
            coupon.minPurchaseAmount &&
            data.orderTotal < coupon.minPurchaseAmount
        ) {
            throw new BusinessRuleViolationError(
                `Minimum purchase amount of $${coupon.minPurchaseAmount} required`,
            );
        }

        if (data.productIds && data.productIds.length > 0) {
            const hasApplicableProduct = data.productIds.some((id) =>
                isApplicableToProduct(coupon, id),
            );
            if (!hasApplicableProduct) {
                throw new BusinessRuleViolationError(
                    "Coupon not applicable to products in cart",
                );
            }
        }

        if (data.categoryIds && data.categoryIds.length > 0) {
            const hasApplicableCategory = data.categoryIds.some((id) =>
                isApplicableToCategory(coupon, id),
            );
            if (!hasApplicableCategory) {
                throw new BusinessRuleViolationError(
                    "Coupon not applicable to product categories in cart",
                );
            }
        }

        if (
            coupon.applicableServices &&
            coupon.applicableServices.length > 0 &&
            data.serviceIds &&
            data.serviceIds.length > 0
        ) {
            const hasApplicableService = data.serviceIds.some((id) =>
                coupon.applicableServices.includes(id),
            );
            if (!hasApplicableService) {
                throw new BusinessRuleViolationError(
                    "Coupon not applicable to this service",
                );
            }
        } else if (
            coupon.applicableServices &&
            coupon.applicableServices.length > 0 &&
            (!data.serviceIds || data.serviceIds.length === 0)
        ) {
            if (
                data.productIds &&
                data.productIds.length > 0 &&
                coupon.applicableProducts.length === 0 &&
                coupon.applicableCategories.length === 0
            ) {
                throw new BusinessRuleViolationError(
                    "Coupon is only applicable to services",
                );
            }
        }

        const discountAmount = calculateDiscount(coupon, data.orderTotal);

        return Success(
            {
                valid: true,
                coupon,
                discountAmount,
                message: "Coupon is valid",
            },
            "Coupon is valid",
        );
    }
}
