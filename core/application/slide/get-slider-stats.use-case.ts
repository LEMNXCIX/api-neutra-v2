import { ISlideRepository } from '@/core/repositories/slide.repository.interface';

export class GetSliderStatsUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string) {
        try {
            const stats = await this.slideRepository.getStats(tenantId);
            return {
                success: true,
                code: 200,
                message: 'Slider stats retrieved successfully',
                data: stats
            };
        } catch (error: any) {
            console.error('Error getting slider stats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
}
