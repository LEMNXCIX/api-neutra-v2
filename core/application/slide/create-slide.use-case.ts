import { ISlideRepository } from "@/core/repositories/slide.repository.interface";
import { CreateSlideshowDTO } from "@/core/application/dtos/requests/slide.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class CreateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) {}

    async execute(
        tenantId: string,
        data: CreateSlideshowDTO,
    ): Promise<UseCaseResult> {
        const newSlide: CreateSlideshowDTO = {
            title: data.title,
            img: data.img,
            desc: data.desc,
            active: data.active,
        };
        const slide = await this.slideRepository.create(tenantId, newSlide);
        return Success(slide, "Slide creado");
    }
}
