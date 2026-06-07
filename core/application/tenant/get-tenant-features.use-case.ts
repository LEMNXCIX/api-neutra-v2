import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetTenantFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        return Success(features, "Tenant features retrieved successfully");
    }
}
