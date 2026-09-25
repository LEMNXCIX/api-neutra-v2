import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import {
    ILoyaltyRepository,
    LoyaltyCampaignClaimResult,
    LoyaltyRewardClaimResult,
} from "@/core/repositories/loyalty.repository.interface";
import { assertLoyaltyCampaignFeatures } from "@/core/entities/loyalty.entity";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

function validateClaimIdentity(
    tenantId: string,
    campaignOrUserId: string,
    userId?: string,
): void {
    if (!tenantId?.trim() || !campaignOrUserId?.trim() || !userId?.trim()) {
        throw new ValidationError(
            "Tenant, campaign, and customer identity are required",
            "MISSING_REQUIRED_FIELDS",
        );
    }
}

export class ClaimLoyaltyRewardUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyRewardClaimResult>>;
    async execute(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignClaimResult>>;
    async execute(
        tenantId: string,
        second: string,
        third?: string,
    ): Promise<UseCaseResult<LoyaltyRewardClaimResult | LoyaltyCampaignClaimResult>> {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);

        assertLoyaltyCampaignFeatures(
            await this.featureRepository.getTenantFeatureStatus(tenantId),
        );

        if (third !== undefined) {
            validateClaimIdentity(tenantId, second, third);
            const result = await this.loyaltyRepository.claimCampaignReward(
                tenantId,
                second,
                third,
            );
            return Success(result, "Loyalty campaign reward claimed successfully");
        }

        validateClaimIdentity(tenantId, second, second);
        const config = tenant.config?.loyalty;
        const templateCouponId = config?.rewardCouponId;
        if (!templateCouponId?.trim()) {
            throw new BusinessRuleViolationError(
                "The loyalty reward is not configured",
                "LOYALTY_REWARD_NOT_CONFIGURED",
            );
        }
        const result = await this.loyaltyRepository.claimReward(
            tenantId,
            second,
            templateCouponId,
            config?.targetPoints,
        );
        return Success(result, "Loyalty reward claimed successfully");
    }

    async executeCampaign(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignClaimResult>> {
        return this.execute(tenantId, campaignId, userId);
    }

    async executeForUser(
        tenantId: string,
        userId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignClaimResult>> {
        return this.executeCampaign(tenantId, campaignId, userId);
    }
}
