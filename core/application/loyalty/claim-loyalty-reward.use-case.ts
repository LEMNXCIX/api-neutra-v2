import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { assertLoyaltyCampaignFeatures } from "@/core/domain/loyalty/loyalty.policy";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import type {
    ILoyaltyRepository,
    LoyaltyCampaignClaimResult,
} from "@/core/repositories/loyalty.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationErrorCodes } from "@/types/error-codes";

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
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
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
        return Success(result, "Loyalty campaign reward claimed successfully");
    }
}
