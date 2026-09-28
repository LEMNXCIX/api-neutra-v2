import type { ISlideRepository } from "@/core/repositories/slide.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class DeleteSlideUseCase {
    constructor(private slideRepository: ISlideRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        await this.slideRepository.delete(tenantId, id);
        return Success(undefined, "El producto ha sido eliminado");
    }
}
