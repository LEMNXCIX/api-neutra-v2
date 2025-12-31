import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { CreateSlideshowDTO } from '@/core/entities/slide.entity';

export class CreateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string, data: any) {
        try {
            const newSlide: CreateSlideshowDTO = {
                title: data.title,
                img: data.img,
                desc: data.desc,
                active: data.active
            };
            const slide = await this.slideRepository.create(tenantId, newSlide);
            return {
                success: true,
                code: 200,
                message: "Slide creado",
                data: slide
            };
        } catch (error: any) {
            console.error('CreateSlideUseCase error:', error);
            return {
                success: false,
                code: 500,
                message: "Ha ocurrido un error al crear el Slide",
                errors: error.message || error
            };
        }
    }
}
