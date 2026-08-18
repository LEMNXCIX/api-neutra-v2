import {
    ISlideRepository,
    SlideshowUpdateData,
} from "@/core/repositories/slide.repository.interface";
import { UpdateSlideshowDTO } from "@/core/application/dtos/requests/slide.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class UpdateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateSlideshowDTO,
    ): Promise<UseCaseResult> {
        const repoData: SlideshowUpdateData = {
            title: data.title,
            img: data.img,
            desc: data.desc,
            active: data.active,
        };
        const slide = await this.slideRepository.update(
            tenantId,
            id,
            repoData,
        );
        return Success(slide, "Slide actualizado");
    }
}
