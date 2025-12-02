import { IBannerRepository } from '@/core/repositories/banner.repository.interface';

export class TrackBannerAnalyticsUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async trackImpression(id: string) {
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

            await this.bannerRepository.incrementImpressions(id);

            return {
                success: true,
                code: 200,
                message: 'Impression tracked',
                data: null
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to track impression',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }

    async trackClick(id: string) {
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

            await this.bannerRepository.incrementClicks(id);

            return {
                success: true,
                code: 200,
                message: 'Click tracked',
                data: null
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to track click',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
