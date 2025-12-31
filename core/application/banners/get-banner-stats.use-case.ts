import { IBannerRepository } from '@/core/repositories/banner.repository.interface';

export class GetBannerStatsUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(tenantId: string) {
        try {
            const stats = await this.bannerRepository.getStats(tenantId);
            return {
                success: true,
                code: 200,
                message: 'Banner stats retrieved successfully',
                data: stats
            };
        } catch (error: any) {
            console.error('Error getting banner stats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
}
