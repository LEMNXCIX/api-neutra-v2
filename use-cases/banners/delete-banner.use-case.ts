import { IBannerRepository } from '@/core/repositories/banner.repository.interface';

export class DeleteBannerUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(id: string) {
        try {
            const banner = await this.bannerRepository.findById(id);

            if (!banner) {
                return {
                    success: false,
                    code: 404,
                    message: 'Banner not found',
                    data: null
                };
            }

            await this.bannerRepository.delete(id);

            return {
                success: true,
                code: 200,
                message: 'Banner deleted successfully',
                data: null
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to delete banner',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
