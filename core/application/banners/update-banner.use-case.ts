import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { UpdateBannerDTO } from '@/core/entities/banner.entity';
import { ValidationErrorCodes } from '@/types/error-codes';

export class UpdateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(id: string, data: UpdateBannerDTO) {
        // Validate dates if both are provided
        if (data.startsAt && data.endsAt) {
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
        }

        try {
            const existingBanner = await this.bannerRepository.findById(id);

            if (!existingBanner) {
                return {
                    success: false,
                    code: 404,
                    message: 'Banner not found',
                    data: null
                };
            }

            const updatedBanner = await this.bannerRepository.update(id, data);

            return {
                success: true,
                code: 200,
                message: 'Banner updated successfully',
                data: updatedBanner
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to update banner',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
