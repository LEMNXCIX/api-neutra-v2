import {
    assertLoyaltyCampaignFeatures,
} from "@/core/domain/loyalty/loyalty.policy";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import {
    ILoyaltyRepository,
    LoyaltyCampaignClaimResult,
} from "@/core/repositories/loyalty.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class ClaimLoyaltyRewardUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignClaimResult>> {
        if (!tenantId?.trim() || !campaignId?.trim() || !userId?.trim()) {
            throw new ValidationError(
                "Tenant, campaign, and customer identity are required",
                "MISSING_REQUIRED_FIELDS",
            );
        }

        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);

        assertLoyaltyCampaignFeatures(
            await this.featureRepository.getTenantFeatureStatus(tenantId),
        );
        const result = await this.loyaltyRepository.claimCampaignReward(
            tenantId,
            campaignId,
            userId,
        );
        return Success(
            result,
            "Loyalty campaign reward claimed successfully",
        );
    }
}
