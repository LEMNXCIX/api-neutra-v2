import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { CreateBannerDTO } from '@/core/entities/banner.entity';
import { ResourceErrorCodes, ValidationErrorCodes } from '@/types/error-codes';

export class CreateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(data: CreateBannerDTO) {
        // Validate dates
        const startsAt = new Date(data.startsAt);
        const endsAt = new Date(data.endsAt);

        if (endsAt <= startsAt) {
            return {
                success: false,
                code: 400,
                message: 'End date must be after start date',
                errors: [{
                    code: ValidationErrorCodes.INVALID_FORMAT,
                    message: 'End date must be after start date',
                    field: 'endsAt'
                }]
            };
        }

        try {
            const banner = await this.bannerRepository.create(data);

            return {
                success: true,
                code: 201,
                message: 'Banner created successfully',
                data: banner
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to create banner',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
