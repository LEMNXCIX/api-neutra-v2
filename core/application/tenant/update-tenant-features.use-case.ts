import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { UpdateTenantFeaturesDTO } from "@/core/application/dtos/requests/tenant.request";

export class UpdateTenantFeaturesUseCase {
    constructor(private featureRepository: IFeatureRepository) {}

    async execute(
        tenantId: string,
        features: UpdateTenantFeaturesDTO,
    ): Promise<UseCaseResult> {
        await this.featureRepository.updateTenantFeatures(
            tenantId,
            features.features,
        );
        return Success(null, "Features updated successfully");
    }
}
