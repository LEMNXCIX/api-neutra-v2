import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import {
    assertTenantFeatureDependencies,
    isLoyaltyOrCouponsDisabling,
} from "@/core/entities/feature.entity";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { UpdateTenantFeaturesDTO } from "@/core/application/dtos/requests/tenant.request";

export class UpdateTenantFeaturesUseCase {
    constructor(
        private featureRepository: IFeatureRepository,
        private loyaltyRepository: ILoyaltyRepository,
    ) {}

    async execute(
        tenantId: string,
        features: UpdateTenantFeaturesDTO,
    ): Promise<UseCaseResult> {
        const changes = features.features ?? {};
        const currentFeatures =
            (await this.featureRepository.getTenantFeatureStatus(tenantId)) ??
            {};
        const mergedFeatures = {
            ...currentFeatures,
            ...changes,
        };

        assertTenantFeatureDependencies(mergedFeatures);
        if (
            isLoyaltyOrCouponsDisabling(currentFeatures, changes) &&
            (await this.loyaltyRepository.hasLiveLoyaltyObligations(tenantId))
        ) {
            throw new BusinessRuleViolationError(
                "LOYALTY and COUPONS cannot be disabled while live loyalty obligations remain",
                "LOYALTY_OBLIGATIONS_EXIST",
            );
        }

        await this.featureRepository.updateTenantFeatures(tenantId, changes);
        return Success(null, "Features updated successfully");
    }
}
