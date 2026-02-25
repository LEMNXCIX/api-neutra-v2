import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetSlidesUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const slides = await this.slideRepository.findAll(tenantId);
        return Success(slides);
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const slide = await this.slideRepository.findById(tenantId, id);
        if (!slide) {
            throw new AppError("Slide not found", 404, ResourceErrorCodes.NOT_FOUND);
        }
        return Success(slide, "Slide retrieved successfully");
    }
}
