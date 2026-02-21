import { IBannerRepository } from '@/core/repositories/banner.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeleteBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const banner = await this.bannerRepository.findById(tenantId, id);

        if (!banner) {
            throw new AppError('Banner not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.bannerRepository.delete(tenantId, id);

        return Success(null, 'Banner deleted successfully');
    }
}
