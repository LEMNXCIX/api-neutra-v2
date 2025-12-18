import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { UpdateSlideshowDTO } from '@/core/entities/slide.entity';

export class UpdateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string, id: string, data: any) {
        try {
            const updateData: UpdateSlideshowDTO = {
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active
            };
            const slide = await this.slideRepository.update(tenantId, id, updateData);
            return {
                success: true,
                code: 200,
                message: "Slide actualizado",
                data: slide
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error al actualizar el Slide",
                errors: error.message || error
            };
        }
    }
}
