import { ISlideRepository } from '@/core/repositories/slide.repository.interface';

export class GetSlidesUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(tenantId: string | undefined) {
        try {
            const slides = await this.slideRepository.findAll(tenantId);
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

    async executeById(tenantId: string, id: string) {
        try {
            const slide = await this.slideRepository.findById(tenantId, id);
            if (!slide) {
                return {
                    success: false,
                    code: 404,
                    message: "Slide not found",
                    errors: "Slide not found"
                };
            }
            return {
                success: true,
                code: 200,
                message: "Slide retrieved successfully",
                data: slide
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Ha ocurrido un error al obtener el Slide",
                errors: error.message || error
            };
        }
    }
}
