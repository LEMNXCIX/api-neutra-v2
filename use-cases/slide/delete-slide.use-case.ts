import { ISlideRepository } from '@/core/repositories/slide.repository.interface';

export class DeleteSlideUseCase {
    constructor(private slideRepository: ISlideRepository) { }

    async execute(id: string) {
        try {
            await this.slideRepository.delete(id);
            return {
                success: true,
                code: 200,
                message: "El producto ha sido eliminado",
                data: undefined
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Ha ocurrido un error al eliminar el Slide",
                errors: error.message || error
            };
        }
    }
}
