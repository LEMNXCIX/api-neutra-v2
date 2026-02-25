import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { UpdateSlideshowDTO } from '@/core/entities/slide.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class UpdateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string, id: string, data: any): Promise<UseCaseResult> {
        const updateData: UpdateSlideshowDTO = {
            title: data.title,
            img: data.img,
            desc: data.desc,
            active: data.active
        };
        const slide = await this.slideRepository.update(tenantId, id, updateData);
        return Success(slide, "Slide actualizado");
    }
}
