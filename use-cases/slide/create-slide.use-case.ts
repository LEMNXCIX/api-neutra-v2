import { ISlideRepository } from '@/core/repositories/slide.repository.interface';
import { CreateSlideDTO } from '@/core/entities/slide.entity';

export class CreateSlideUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(data: any) {
        try {
            const newSlide: CreateSlideDTO = {
                title: data.title,
                img: data.img,
                desc: data.desc
            };
            const slide = await this.slideRepository.create(newSlide);
            return {
                success: true,
                code: 200,
                message: "Slide creado",
                data: slide
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Ha ocurrido un error al crear el Slide",
                errors: error.message || error
            };
        }
    }
}
