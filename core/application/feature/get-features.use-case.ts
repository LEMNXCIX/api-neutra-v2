import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(): Promise<UseCaseResult> {
        const features = await this.featureRepository.findAll();
        return Success(features, "Features retrieved successfully");
    }
}
