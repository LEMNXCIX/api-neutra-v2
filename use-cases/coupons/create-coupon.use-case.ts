import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateCouponDTO, CouponType } from '@/core/entities/coupon.entity';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';

export class CreateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(data: CreateCouponDTO) {
        // Validate coupon code format
        if (!data.code || data.code.trim().length < 3) {
            return {
                success: false,
                code: 400,
                message: 'Coupon code must be at least 3 characters',
                errors: [{
                    code: ValidationErrorCodes.INVALID_LENGTH,
                    message: 'Coupon code must be at least 3 characters',
                    field: 'code'
                }]
            };
        }

        // Validate value based on type
        if (data.type === CouponType.PERCENT && (data.value <= 0 || data.value > 100)) {
            return {
                success: false,
                code: 400,
                message: 'Percentage discount must be between 0 and 100',
                errors: [{
                    code: ValidationErrorCodes.INVALID_FORMAT,
                    message: 'Percentage discount must be between 0 and 100',
                    field: 'value'
                }]
            };
        }

        if (data.type === CouponType.FIXED && data.value <= 0) {
            return {
                success: false,
                code: 400,
                message: 'Fixed discount must be greater than 0',
                errors: [{
                    code: ValidationErrorCodes.INVALID_FORMAT,
                    message: 'Fixed discount must be greater than 0',
                    field: 'value'
                }]
            };
        }

        // Check if code already exists
        const existingCoupon = await this.couponRepository.findByCode(data.code);
        if (existingCoupon) {
            return {
                success: false,
                code: 409,
                message: 'Coupon code already exists',
                errors: [{
                    code: ResourceErrorCodes.ALREADY_EXISTS,
                    message: 'Coupon code already exists',
                    field: 'code'
                }]
            };
        }

        try {
            const coupon = await this.couponRepository.create(data);

            return {
                success: true,
                code: 201,
                message: 'Coupon created successfully',
                data: coupon
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to create coupon',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
