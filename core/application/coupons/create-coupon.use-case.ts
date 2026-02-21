import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { CreateCouponDTO, CouponType } from '@/core/entities/coupon.entity';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';

export class CreateCouponUseCase {
    constructor(private couponRepository: ICouponRepository) { }

    async execute(tenantId: string, data: CreateCouponDTO): Promise<UseCaseResult> {
        if (!data.code || data.code.trim().length < 3) {
            throw new AppError('Coupon code must be at least 3 characters', 400, ValidationErrorCodes.INVALID_LENGTH);
        }

        if (data.type === CouponType.PERCENT && (data.value <= 0 || data.value > 100)) {
            throw new AppError('Percentage discount must be between 0 and 100', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (data.type === CouponType.FIXED && data.value <= 0) {
            throw new AppError('Fixed discount must be greater than 0', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (!data.expiresAt) {
            throw new AppError('Expiration date is required', 400, ValidationErrorCodes.MISSING_REQUIRED_FIELDS);
        }

        const expirationDate = new Date(data.expiresAt);
        if (isNaN(expirationDate.getTime())) {
            throw new AppError('Invalid expiration date format', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        if (expirationDate <= new Date()) {
            throw new AppError('Expiration date must be in the future', 400, ValidationErrorCodes.INVALID_FORMAT);
        }

        const existingCoupon = await this.couponRepository.findByCode(tenantId, data.code);
        if (existingCoupon) {
            throw new AppError('Coupon code already exists', 409, ResourceErrorCodes.ALREADY_EXISTS);
        }

        const coupon = await this.couponRepository.create(tenantId, data);
        return Success(coupon, 'Coupon created successfully');
    }
}
