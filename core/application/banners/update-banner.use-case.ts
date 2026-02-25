import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { UpdateBannerDTO } from '@/core/entities/banner.entity';
import { ValidationErrorCodes, ResourceErrorCodes } from '@/types/error-codes';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';

export class UpdateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(tenantId: string, id: string, data: UpdateBannerDTO): Promise<UseCaseResult> {
        if (data.startsAt && data.endsAt) {
            const startsAt = new Date(data.startsAt);
            const endsAt = new Date(data.endsAt);

            if (endsAt <= startsAt) {
                throw new AppError('End date must be after start date', 400, ValidationErrorCodes.INVALID_FORMAT, [{
                    code: ValidationErrorCodes.INVALID_FORMAT,
                    message: 'End date must be after start date',
                    field: 'endsAt'
                }]);
            }
        }

        const existingBanner = await this.bannerRepository.findById(tenantId, id);
        if (!existingBanner) {
            throw new AppError('Banner not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        const updatedBanner = await this.bannerRepository.update(tenantId, id, data);
        return Success(updatedBanner, 'Banner updated successfully');
    }
}
