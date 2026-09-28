import { LoyaltyCampaignLifecycleAction } from "@/core/application/dtos/requests/loyalty.request";
import { loadLoyaltyCampaignTenant } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    assertLoyaltyCampaignRewardConfigured,
    assertLoyaltyCampaignSourceCompatible,
    isValidLoyaltyCampaignDates,
} from "@/core/domain/loyalty/loyalty.policy";
import {
    type LoyaltyCampaign,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import type { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { LoyaltyErrorCodes, ValidationErrorCodes } from "@/types/error-codes";

function normalizeAction(
    action: LoyaltyCampaignLifecycleAction | string,
): LoyaltyCampaignLifecycleAction {
    const normalized = String(action).toLowerCase();
    if (
        normalized === LoyaltyCampaignLifecycleAction.ACTIVATE ||
        normalized === LoyaltyCampaignLifecycleAction.END ||
        normalized === LoyaltyCampaignLifecycleAction.ARCHIVE ||
        normalized === LoyaltyCampaignLifecycleAction.DELETE
    ) {
        return normalized as LoyaltyCampaignLifecycleAction;
    }
    if (normalized === LoyaltyCampaignStatus.ACTIVE.toLowerCase()) {
        return LoyaltyCampaignLifecycleAction.ACTIVATE;
    }
    if (normalized === LoyaltyCampaignStatus.ENDED.toLowerCase()) {
        return LoyaltyCampaignLifecycleAction.END;
    }
    if (normalized === LoyaltyCampaignStatus.ARCHIVED.toLowerCase()) {
        return LoyaltyCampaignLifecycleAction.ARCHIVE;
    }
    throw new ValidationError(
        "Campaign lifecycle action is invalid",
        ValidationErrorCodes.INVALID_LOYALTY_CAMPAIGN_ACTION,
    );
}

export class TransitionLoyaltyCampaignUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        campaignId: string,
        action: LoyaltyCampaignLifecycleAction | string,
    ): Promise<UseCaseResult<LoyaltyCampaign | null>> {
        const tenant = await loadLoyaltyCampaignTenant(
            this.tenantRepository,
            this.featureRepository,
            tenantId,
        );
        if (!campaignId?.trim()) {
            throw new ValidationError(
                "Campaign ID is required",
                ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
            );
        }
        const campaign = await this.loyaltyRepository.getCampaign(
            tenantId,
            campaignId,
        );
        if (!campaign) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }
        const normalizedAction = normalizeAction(action);
        if (normalizedAction === LoyaltyCampaignLifecycleAction.DELETE) {
            await this.loyaltyRepository.deleteCampaign(tenantId, campaignId);
            return Success(null, "Loyalty campaign deleted successfully");
        }

        if (normalizedAction === LoyaltyCampaignLifecycleAction.ACTIVATE) {
            assertLoyaltyCampaignSourceCompatible(tenant.type, campaign.source);
            if (
                !isValidLoyaltyCampaignDates(
                    campaign.startsAt,
                    campaign.endsAt,
                    campaign.claimUntil,
                )
            ) {
                throw new BusinessRuleViolationError(
                    "Campaign dates are invalid",
                    ValidationErrorCodes.INVALID_CAMPAIGN_DATES,
                );
            }
            assertLoyaltyCampaignRewardConfigured(
                campaign.rewardCouponId,
                campaign.rewardValidDays,
                "Campaign reward template is invalid",
            );
        }

        const target =
            normalizedAction === LoyaltyCampaignLifecycleAction.ACTIVATE
                ? LoyaltyCampaignStatus.ACTIVE
                : normalizedAction === LoyaltyCampaignLifecycleAction.END
                  ? LoyaltyCampaignStatus.ENDED
                  : LoyaltyCampaignStatus.ARCHIVED;
        const transitioned =
            await this.loyaltyRepository.transitionCampaignStatus(
                tenantId,
                campaignId,
                campaign.status,
                target,
            );
        if (!transitioned) {
            throw new BusinessRuleViolationError(
                "The loyalty campaign lifecycle changed concurrently",
                LoyaltyErrorCodes.CAMPAIGN_TRANSITION_CONFLICT,
            );
        }
        return Success(
            transitioned,
            `Loyalty campaign ${normalizedAction} completed successfully`,
        );
    }

    async activate(
        tenantId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaign | null>> {
        return this.execute(
            tenantId,
            campaignId,
            LoyaltyCampaignLifecycleAction.ACTIVATE,
        );
    }

    async end(
        tenantId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaign | null>> {
        return this.execute(
            tenantId,
            campaignId,
            LoyaltyCampaignLifecycleAction.END,
        );
    }

    async archive(
        tenantId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaign | null>> {
        return this.execute(
            tenantId,
            campaignId,
            LoyaltyCampaignLifecycleAction.ARCHIVE,
        );
    }

    async deleteDraft(
        tenantId: string,
        campaignId: string,
    ): Promise<UseCaseResult<null>> {
        const result = await this.execute(
            tenantId,
            campaignId,
            LoyaltyCampaignLifecycleAction.DELETE,
        );
        return {
            success: result.success,
            message: result.message,
            data: null,
            ...(result.meta ? { meta: result.meta } : {}),
        };
    }
}
