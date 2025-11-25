import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { ValidateCouponDTO, CouponValidationResult, CouponType } from '@/core/entities/coupon.entity';

export class ValidateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(data: ValidateCouponDTO): Promise<CouponValidationResult> {
        try {
            // Find coupon by code
            const coupon = await this.couponRepository.findByCode(data.code);

            if (!coupon) {
                return {
                    valid: false,
                    message: 'Coupon not found'
                };
            }

            // Check if coupon is active
            if (!coupon.active) {
                return {
                    valid: false,
                    message: 'Coupon is not active'
                };
            }

            // Check if coupon has expired
            if (new Date() > new Date(coupon.expiresAt)) {
                return {
                    valid: false,
                    message: 'Coupon has expired'
                };
            }

            // Check usage limit
            if (coupon.usageLimit !== null && coupon.usageLimit !== undefined && coupon.usageCount >= coupon.usageLimit) {
                return {
                    valid: false,
                    message: 'Coupon usage limit reached'
                };
            }

            // Check minimum purchase amount
            if (coupon.minPurchaseAmount && data.orderTotal < coupon.minPurchaseAmount) {
                return {
                    valid: false,
                    message: `Minimum purchase amount of $${coupon.minPurchaseAmount} required`
                };
            }

            // Check applicable products
            if (coupon.applicableProducts.length > 0 && data.productIds) {
                const hasApplicableProduct = data.productIds.some(id =>
                    coupon.applicableProducts.includes(id)
                );
                if (!hasApplicableProduct) {
                    return {
                        valid: false,
                        message: 'Coupon not applicable to products in cart'
                    };
                }
            }

            // Check applicable categories
            if (coupon.applicableCategories.length > 0 && data.categoryIds) {
                const hasApplicableCategory = data.categoryIds.some(id =>
                    coupon.applicableCategories.includes(id)
                );
                if (!hasApplicableCategory) {
                    return {
                        valid: false,
                        message: 'Coupon not applicable to product categories in cart'
                    };
                }
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (coupon.type === CouponType.PERCENT) {
                discountAmount = (data.orderTotal * coupon.value) / 100;
                // Apply max discount if set
                if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
                    discountAmount = coupon.maxDiscountAmount;
                }
            } else if (coupon.type === CouponType.FIXED) {
                discountAmount = coupon.value;
                // Don't allow discount to exceed order total
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
        } catch (error: any) {
            return {
                valid: false,
                message: 'Error validating coupon'
            };
        }
    }
}
