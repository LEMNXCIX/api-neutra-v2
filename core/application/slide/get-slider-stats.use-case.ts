import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetSliderStatsUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.slideRepository.getStats(tenantId);
        return Success(stats, 'Slider stats retrieved successfully');
    }
}
