import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Tenant } from "@/core/entities/tenant.entity";
import {
    LoyaltyCampaign,
} from "@/core/entities/loyalty.entity";
import {
    assertLoyaltyCampaignFeatures,
    assertLoyaltyCampaignSourceCompatible,
    assertLoyaltyRewardTemplate,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
} from "@/core/domain/loyalty/loyalty.policy";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    CreateLoyaltyCampaignDTO,
    LoyaltyRewardDefinitionDTO,
} from "@/core/application/dtos/requests/loyalty.request";
import {
    CreateLoyaltyCampaignData,
    LoyaltyCampaignRewardDefinition,
} from "@/core/repositories/loyalty.repository.interface";
import { ValidationErrorCodes } from "@/types/error-codes";

export function toLoyaltyCampaignDate(
    value: Date | string,
    field: string,
): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw new ValidationError(
            `${field} must be a valid date`,
            ValidationErrorCodes.INVALID_CAMPAIGN_DATES,
        );
    }
    return date;
}

export function toLoyaltyRewardDefinition(
    reward: LoyaltyRewardDefinitionDTO,
): LoyaltyCampaignRewardDefinition {
    assertLoyaltyRewardTemplate(reward);
    const normalizeIds = (values: string[] | undefined): string[] =>
        [...new Set((values ?? []).map((value) => value.trim()))];
    return {
        type: reward.type,
        value: reward.value,
        // The definition is the entity's required-nullable shape, so an absent
        // request field normalises to null here. Both spellings already reached
        // the Coupon row as null and both pass assertLoyaltyRewardTemplate.
        description:
            reward.description === undefined || reward.description === null
                ? null
                : reward.description.trim(),
        minPurchaseAmount: reward.minPurchaseAmount ?? null,
        maxDiscountAmount: reward.maxDiscountAmount ?? null,
        applicableProducts: normalizeIds(reward.applicableProducts),
        applicableCategories: normalizeIds(reward.applicableCategories),
        applicableServices: normalizeIds(reward.applicableServices),
    };
}

export async function loadLoyaltyCampaignTenant(
    tenantRepository: ITenantRepository,
    featureRepository: IFeatureRepository,
    tenantId: string,
): Promise<Tenant> {
    if (!tenantId?.trim()) {
        throw new ValidationError(
            "Tenant ID is required",
            ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
        );
    }
    const tenant = await tenantRepository.findById(tenantId);
    if (!tenant) {
        throw new EntityNotFoundError("Tenant", tenantId);
    }
    const features =
        await featureRepository.getTenantFeatureStatus(tenantId);
    assertLoyaltyCampaignFeatures(features);
    return tenant;
}

export class CreateLoyaltyCampaignUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        data: CreateLoyaltyCampaignDTO,
    ): Promise<UseCaseResult<LoyaltyCampaign>> {
        const tenant = await loadLoyaltyCampaignTenant(
            this.tenantRepository,
            this.featureRepository,
            tenantId,
        );
        if (!data || typeof data !== "object") {
            throw new ValidationError(
                "Campaign data is required",
                ValidationErrorCodes.INVALID_CAMPAIGN,
            );
        }
        assertLoyaltyCampaignSourceCompatible(tenant.type, data.source);
        if (!isValidLoyaltyCampaignTarget(data.metric, data.targetValue)) {
            throw new ValidationError(
                "Campaign target is invalid",
                ValidationErrorCodes.INVALID_CAMPAIGN_TARGET,
            );
        }
        if (!isValidLoyaltyRewardValidDays(data.rewardValidDays)) {
            throw new ValidationError(
                "Campaign reward validity is invalid",
                ValidationErrorCodes.INVALID_LOYALTY_REWARD_VALIDITY,
            );
        }
        if (
            data.maxClaims !== undefined &&
            data.maxClaims !== null &&
            !isValidLoyaltyCampaignMaxClaims(data.maxClaims)
        ) {
            throw new ValidationError(
                "Campaign maxClaims is invalid",
                ValidationErrorCodes.INVALID_CAMPAIGN_MAX_CLAIMS,
            );
        }
        const startsAt = toLoyaltyCampaignDate(data.startsAt, "startsAt");
        const endsAt = toLoyaltyCampaignDate(data.endsAt, "endsAt");
        const claimUntil = toLoyaltyCampaignDate(
            data.claimUntil,
            "claimUntil",
        );
        if (!isValidLoyaltyCampaignDates(startsAt, endsAt, claimUntil)) {
            throw new ValidationError(
                "Campaign dates must satisfy startsAt < endsAt <= claimUntil",
                ValidationErrorCodes.INVALID_CAMPAIGN_DATES,
            );
        }
        const reward = toLoyaltyRewardDefinition(data.reward);
        const createData: CreateLoyaltyCampaignData = {
            name: data.name,
            description: data.description,
            source: data.source,
            metric: data.metric,
            targetValue: data.targetValue,
            startsAt,
            endsAt,
            claimUntil,
            reward,
            rewardValidDays: data.rewardValidDays,
            maxClaims: data.maxClaims,
        };
        const campaign = await this.loyaltyRepository.createCampaign(
            tenantId,
            createData,
        );
        return Success(campaign, "Loyalty campaign created successfully");
    }
}
