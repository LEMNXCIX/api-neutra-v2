import { ISlideRepository } from '@/core/repositories/slide.repository.interface';

export class GetSlidesUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute() {
        try {
            const slides = await this.slideRepository.findAll();
            return {
                success: true,
                code: 200,
                message: "",
                data: slides
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Ha ocurrido un error al obtener Slides",
                errors: error.message || error
            };
        }
    }
}
