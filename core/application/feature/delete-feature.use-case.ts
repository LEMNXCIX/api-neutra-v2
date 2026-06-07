import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class DeleteFeatureUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(id: string): Promise<UseCaseResult> {
        const existing = await this.featureRepository.findById(id);
        if (!existing) {
            throw new EntityNotFoundError("Feature", id);
        }

        await this.featureRepository.delete(id);
        return Success(null, "Feature deleted successfully");
    }
}
