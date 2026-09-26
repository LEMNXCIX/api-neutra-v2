import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import {
    LoyaltyCampaign,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import {
    assertLoyaltyCampaignSourceCompatible,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
} from "@/core/domain/loyalty/loyalty.policy";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { UpdateLoyaltyCampaignDTO } from "@/core/application/dtos/requests/loyalty.request";
import { UpdateLoyaltyCampaignData } from "@/core/repositories/loyalty.repository.interface";
import {
    loadLoyaltyCampaignTenant,
    toLoyaltyCampaignDate,
    toLoyaltyRewardDefinition,
} from "@/core/application/loyalty/create-loyalty-campaign.use-case";

export class UpdateLoyaltyCampaignUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        campaignId: string,
        data: UpdateLoyaltyCampaignDTO,
    ): Promise<UseCaseResult<LoyaltyCampaign>> {
        const tenant = await loadLoyaltyCampaignTenant(
            this.tenantRepository,
            this.featureRepository,
            tenantId,
        );
        if (!campaignId?.trim()) {
            throw new ValidationError(
                "Campaign ID is required",
                "MISSING_REQUIRED_FIELDS",
            );
        }
        if (!data || typeof data !== "object") {
            throw new ValidationError(
                "Campaign update is required",
                "INVALID_CAMPAIGN",
            );
        }
        const current = await this.loyaltyRepository.getCampaign(
            tenantId,
            campaignId,
        );
        if (!current) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        if (current.status !== LoyaltyCampaignStatus.DRAFT) {
            throw new BusinessRuleViolationError(
                "Only DRAFT loyalty campaigns can be updated",
                "LOYALTY_CAMPAIGN_NOT_DRAFT",
            );
        }
        const source = data.source ?? current.source;
        assertLoyaltyCampaignSourceCompatible(tenant.type, source);
        const metric = data.metric ?? current.metric;
        const targetValue = data.targetValue ?? current.targetValue;
        if (!isValidLoyaltyCampaignTarget(metric, targetValue)) {
            throw new ValidationError(
                "Campaign target is invalid",
                "INVALID_CAMPAIGN_TARGET",
            );
        }
        if (
            data.rewardValidDays !== undefined &&
            !isValidLoyaltyRewardValidDays(data.rewardValidDays)
        ) {
            throw new ValidationError(
                "Campaign reward validity is invalid",
                "INVALID_LOYALTY_REWARD_VALIDITY",
            );
        }
        if (
            data.maxClaims !== undefined &&
            data.maxClaims !== null &&
            !isValidLoyaltyCampaignMaxClaims(data.maxClaims)
        ) {
            throw new ValidationError(
                "Campaign maxClaims is invalid",
                "INVALID_CAMPAIGN_MAX_CLAIMS",
            );
        }

        const updateData: UpdateLoyaltyCampaignData = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.description !== undefined) {
            updateData.description = data.description;
        }
        if (data.source !== undefined) updateData.source = data.source;
        if (data.metric !== undefined) updateData.metric = data.metric;
        if (data.targetValue !== undefined) {
            updateData.targetValue = data.targetValue;
        }
        if (data.startsAt !== undefined) {
            updateData.startsAt = toLoyaltyCampaignDate(
                data.startsAt,
                "startsAt",
            );
        }
        if (data.endsAt !== undefined) {
            updateData.endsAt = toLoyaltyCampaignDate(data.endsAt, "endsAt");
        }
        if (data.claimUntil !== undefined) {
            updateData.claimUntil = toLoyaltyCampaignDate(
                data.claimUntil,
                "claimUntil",
            );
        }
        const reward = data.reward;
        if (reward) {
            updateData.reward = toLoyaltyRewardDefinition(reward);
        }
        if (data.rewardValidDays !== undefined) {
            updateData.rewardValidDays = data.rewardValidDays;
        }
        if (data.maxClaims !== undefined) updateData.maxClaims = data.maxClaims;
        const startsAt =
            data.startsAt === undefined
                ? current.startsAt
                : toLoyaltyCampaignDate(data.startsAt, "startsAt");
        const endsAt =
            data.endsAt === undefined
                ? current.endsAt
                : toLoyaltyCampaignDate(data.endsAt, "endsAt");
        const claimUntil =
            data.claimUntil === undefined
                ? current.claimUntil
                : toLoyaltyCampaignDate(data.claimUntil, "claimUntil");
        if (!isValidLoyaltyCampaignDates(startsAt, endsAt, claimUntil)) {
            throw new ValidationError(
                "Campaign dates must satisfy startsAt < endsAt <= claimUntil",
                "INVALID_CAMPAIGN_DATES",
            );
        }

        const updated = await this.loyaltyRepository.updateCampaign(
            tenantId,
            campaignId,
            updateData,
        );
        return Success(updated, "Loyalty campaign updated successfully");
    }
}
