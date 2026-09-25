import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { Tenant } from "@/core/entities/tenant.entity";
import {
    assertLoyaltyCampaignFeatures,
    assertLoyaltyCampaignSourceCompatible,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
    LoyaltyCampaign,
} from "@/core/entities/loyalty.entity";
import { CouponType } from "@/core/entities/coupon.entity";
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

export function toLoyaltyCampaignDate(
    value: Date | string,
    field: string,
): Date {
    const date = value instanceof Date ? new Date(value) : new Date(value);
    if (!Number.isFinite(date.getTime())) {
        throw new ValidationError(
            `${field} must be a valid date`,
            "INVALID_CAMPAIGN_DATES",
        );
    }
    return date;
}

export function toLoyaltyRewardDefinition(
    reward: LoyaltyRewardDefinitionDTO,
): LoyaltyCampaignRewardDefinition {
    if (!reward || !Object.values(CouponType).includes(reward.type)) {
        throw new ValidationError(
            "Reward definition type is invalid",
            "INVALID_LOYALTY_REWARD_TEMPLATE",
        );
    }
    if (
        typeof reward.value !== "number" ||
        !Number.isFinite(reward.value) ||
        reward.value <= 0 ||
        (reward.type === CouponType.PERCENT && reward.value > 100)
    ) {
        throw new ValidationError(
            "Reward definition value is invalid",
            "INVALID_LOYALTY_REWARD_TEMPLATE",
        );
    }
    for (const [field, value] of [
        ["minPurchaseAmount", reward.minPurchaseAmount],
        ["maxDiscountAmount", reward.maxDiscountAmount],
    ] as const) {
        if (
            value !== undefined &&
            value !== null &&
            (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        ) {
            throw new ValidationError(
                `Reward definition ${field} is invalid`,
                "INVALID_LOYALTY_REWARD_TEMPLATE",
            );
        }
    }
    if (
        reward.description !== undefined &&
        reward.description !== null &&
        typeof reward.description !== "string"
    ) {
        throw new ValidationError(
            "Reward definition description is invalid",
            "INVALID_LOYALTY_REWARD_TEMPLATE",
        );
    }
    const normalizeIds = (
        values: string[] | undefined,
        field: string,
    ): string[] => {
        if (values === undefined) return [];
        if (
            !Array.isArray(values) ||
            values.some(
                (value) =>
                    typeof value !== "string" || value.trim().length === 0,
            )
        ) {
            throw new ValidationError(
                `Reward definition ${field} is invalid`,
                "INVALID_LOYALTY_REWARD_TEMPLATE",
            );
        }
        return [...new Set(values.map((value) => value.trim()))];
    };
    return {
        type: reward.type,
        value: reward.value,
        description:
            reward.description === undefined || reward.description === null
                ? reward.description
                : reward.description.trim(),
        minPurchaseAmount: reward.minPurchaseAmount ?? undefined,
        maxDiscountAmount: reward.maxDiscountAmount ?? undefined,
        applicableProducts: normalizeIds(
            reward.applicableProducts,
            "applicableProducts",
        ),
        applicableCategories: normalizeIds(
            reward.applicableCategories,
            "applicableCategories",
        ),
        applicableServices: normalizeIds(
            reward.applicableServices,
            "applicableServices",
        ),
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
            "MISSING_REQUIRED_FIELDS",
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
                "INVALID_CAMPAIGN",
            );
        }
        assertLoyaltyCampaignSourceCompatible(tenant.type, data.source);
        if (!isValidLoyaltyCampaignTarget(data.metric, data.targetValue)) {
            throw new ValidationError(
                "Campaign target is invalid",
                "INVALID_CAMPAIGN_TARGET",
            );
        }
        if (!isValidLoyaltyRewardValidDays(data.rewardValidDays)) {
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
        const startsAt = toLoyaltyCampaignDate(data.startsAt, "startsAt");
        const endsAt = toLoyaltyCampaignDate(data.endsAt, "endsAt");
        const claimUntil = toLoyaltyCampaignDate(
            data.claimUntil,
            "claimUntil",
        );
        if (!isValidLoyaltyCampaignDates(startsAt, endsAt, claimUntil)) {
            throw new ValidationError(
                "Campaign dates must satisfy startsAt < endsAt <= claimUntil",
                "INVALID_CAMPAIGN_DATES",
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
