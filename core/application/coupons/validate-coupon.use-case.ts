import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { ValidateCouponDTO, CouponValidationResult, CouponType } from '@/core/entities/coupon.entity';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';

export class ValidateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string, data: ValidateCouponDTO): Promise<CouponValidationResult> {
        const coupon = await this.couponRepository.findByCode(tenantId, data.code);

        if (!coupon) {
            throw new AppError('Coupon not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        if (!coupon.active) {
            throw new AppError('Coupon is not active', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (new Date() > new Date(coupon.expiresAt)) {
            throw new AppError('Coupon has expired', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
            throw new AppError('Coupon usage limit reached', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (coupon.minPurchaseAmount && data.orderTotal < coupon.minPurchaseAmount) {
            throw new AppError(`Minimum purchase amount of $${coupon.minPurchaseAmount} required`, 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        // Check applicable products
        if (coupon.applicableProducts.length > 0 && data.productIds && data.productIds.length > 0) {
            const hasApplicableProduct = data.productIds.some(id =>
                coupon.applicableProducts.includes(id)
            );
            if (!hasApplicableProduct) {
                throw new AppError('Coupon not applicable to products in cart', 400, ValidationErrorCodes.INVALID_FORMAT);
            }
        }

        // Check applicable categories
        if (coupon.applicableCategories.length > 0 && data.categoryIds && data.categoryIds.length > 0) {
            const hasApplicableCategory = data.categoryIds.some(id =>
                coupon.applicableCategories.includes(id)
            );
            if (!hasApplicableCategory) {
                throw new AppError('Coupon not applicable to product categories in cart', 400, ValidationErrorCodes.INVALID_FORMAT);
            }
        }

        // Check applicable services
        if (coupon.applicableServices && coupon.applicableServices.length > 0 && data.serviceIds && data.serviceIds.length > 0) {
            const hasApplicableService = data.serviceIds.some(id =>
                coupon.applicableServices.includes(id)
            );
            if (!hasApplicableService) {
                throw new AppError('Coupon not applicable to this service', 400, ValidationErrorCodes.INVALID_FORMAT);
            }
        } else if (coupon.applicableServices && coupon.applicableServices.length > 0 && (!data.serviceIds || data.serviceIds.length === 0)) {
            if ((data.productIds && data.productIds.length > 0) &&
                (coupon.applicableProducts.length === 0 && coupon.applicableCategories.length === 0)) {
                throw new AppError('Coupon is only applicable to services', 400, ValidationErrorCodes.INVALID_FORMAT);
            }
        }

        let discountAmount = 0;
        if (coupon.type === CouponType.PERCENT) {
            discountAmount = (data.orderTotal * coupon.value) / 100;
            if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                discountAmount = coupon.maxDiscountAmount;
            }
        } else if (coupon.type === CouponType.FIXED) {
            discountAmount = coupon.value;
            if (discountAmount > data.orderTotal) {
                discountAmount = data.orderTotal;
            }
        }

        return {
            valid: true,
            coupon,
            discountAmount,
            message: 'Coupon is valid'
        };
    }
}
