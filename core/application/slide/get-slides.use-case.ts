import { ISlideRepository } from "@/core/repositories/slide.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetSlidesUseCase {
    constructor(private slideRepository: ISlideRepository) {}

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const slides = await this.slideRepository.findAll(tenantId);
        return Success(slides);
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const slide = await this.slideRepository.findById(tenantId, id);
        if (!slide) {
            throw new EntityNotFoundError("Slide", id);
        }
        return Success(slide, "Slide retrieved successfully");
    }
}
