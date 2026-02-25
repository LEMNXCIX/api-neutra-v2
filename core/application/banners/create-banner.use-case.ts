import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { CreateBannerDTO } from '@/core/entities/banner.entity';
import { ValidationErrorCodes } from '@/types/error-codes';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';

export class CreateBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(tenantId: string, data: CreateBannerDTO): Promise<UseCaseResult> {
        const startsAt = new Date(data.startsAt);
        const endsAt = new Date(data.endsAt);

        if (endsAt <= startsAt) {
            throw new AppError('End date must be after start date', 400, ValidationErrorCodes.INVALID_FORMAT, [{
                code: ValidationErrorCodes.INVALID_FORMAT,
                message: 'End date must be after start date',
                field: 'endsAt'
            }]);
        }

        const banner = await this.bannerRepository.create(tenantId, data);
        return Success(banner, 'Banner created successfully');
    }
}
