import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Feature } from "@/core/entities/feature.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class UpdateFeatureUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(id: string, data: Partial<Feature>): Promise<UseCaseResult> {
        const existing = await this.featureRepository.findById(id);
        if (!existing) {
            throw new EntityNotFoundError("Feature", id);
        }

        if (data.key && data.key !== existing.key) {
            const collision = await this.featureRepository.findByKey(data.key);
            if (collision) {
                throw new DuplicateEntityError("Feature", "key", data.key);
            }
        }

        const feature = await this.featureRepository.update(id, data);
        return Success(feature, "Feature updated successfully");
    }
}
