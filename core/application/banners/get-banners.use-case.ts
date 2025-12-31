import { IBannerRepository } from '@/core/repositories/banner.repository.interface';

export class GetBannersUseCase {
    constructor(private bannerRepository: IBannerRepository) { }

    async execute(tenantId: string | undefined, activeOnly: boolean = false) {
        try {

            const banners = activeOnly
                ? await this.bannerRepository.findActive(tenantId)
                : await this.bannerRepository.findAll(tenantId);


            return {
                success: true,
                code: 200,
                message: 'Banners retrieved successfully',
                data: banners
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve banners',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }

    async executeById(tenantId: string, id: string) {
        try {
            const banner = await this.bannerRepository.findById(tenantId, id);

            if (!banner) {
                return {
                    success: false,
                    code: 404,
                    message: 'Banner not found',
                    data: null
                };
            }

            return {
                success: true,
                code: 200,
                message: 'Banner retrieved successfully',
                data: banner
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve banner',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
