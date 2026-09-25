import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import {
    assertLoyaltyCampaignFeatures,
    DEFAULT_LOYALTY_TARGET_POINTS,
    getEffectiveLoyaltyCampaignStatus,
    getLoyaltyCampaignCustomerStatus,
    getLoyaltyCampaignProgressValue,
    getLoyaltyCampaignRemainingValue,
    isValidLoyaltyTargetPoints,
    LoyaltyCampaign,
    LoyaltyCampaignCustomerSummary,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignStatus,
    LoyaltyStatus,
} from "@/core/entities/loyalty.entity";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

function validateCustomerIdentity(tenantId: string, userId: string): void {
    if (!tenantId?.trim() || !userId?.trim()) {
        throw new ValidationError(
            "Tenant and customer identity are required",
            "MISSING_REQUIRED_FIELDS",
        );
    }
}

export async function buildLoyaltyCampaignCustomerSummary(
    loyaltyRepository: ILoyaltyRepository,
    tenantId: string,
    campaign: LoyaltyCampaign,
    userId: string,
    now = new Date(),
    knownClaim?: LoyaltyCampaignRewardClaim | null,
): Promise<LoyaltyCampaignCustomerSummary> {
    const progress = await loyaltyRepository.getCampaignProgress(
        tenantId,
        campaign.id,
        userId,
    );
    const claim =
        knownClaim === undefined
            ? await loyaltyRepository.findCampaignRewardClaim(
                  tenantId,
                  campaign.id,
                  userId,
              )
            : knownClaim;
    const progressValue = getLoyaltyCampaignProgressValue(
        campaign.metric,
        progress.progressValue,
    );
    const targetValue = getLoyaltyCampaignProgressValue(
        campaign.metric,
        progress.targetValue,
    );
    const lifecycleStatus = getEffectiveLoyaltyCampaignStatus(
        campaign.status,
        campaign.startsAt,
        campaign.endsAt,
        now,
    );
    const customerStatus = getLoyaltyCampaignCustomerStatus({
        lifecycleStatus,
        startsAt: campaign.startsAt,
        claimUntil: campaign.claimUntil,
        reachedTarget: progress.reachedTarget,
        claimed: Boolean(claim),
        now,
    });
    const remainingValue = getLoyaltyCampaignRemainingValue(
        progressValue,
        targetValue,
    );
    return {
        campaignId: campaign.id,
        metric: campaign.metric,
        progressValue,
        targetValue,
        remainingValue,
        lifecycleStatus,
        customerStatus,
        progress: progressValue,
        target: targetValue,
        remaining: remainingValue,
        status: customerStatus,
        campaignStatus: lifecycleStatus,
        ...(claim ? { claim, ...(claim.coupon ? { coupon: claim.coupon } : {}) } : {}),
    };
}

export class GetCustomerLoyaltySummaryUseCase {
    constructor(
        private loyaltyRepository: ILoyaltyRepository,
        private tenantRepository: ITenantRepository,
        private featureRepository: IFeatureRepository,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<any>>;
    async execute(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>>;
    async execute(
        tenantId: string,
        second: string,
        third?: string,
    ): Promise<UseCaseResult<any>> {
        const hasCampaign = third !== undefined;
        const campaignId = hasCampaign ? second : undefined;
        const userId = hasCampaign ? third : second;
        validateCustomerIdentity(tenantId, userId);

        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);
        assertLoyaltyCampaignFeatures(
            await this.featureRepository.getTenantFeatureStatus(tenantId),
        );

        if (!hasCampaign) {
            return this.executeLegacySummary(tenant, tenantId, userId);
        }

        if (hasCampaign) {
            const campaign = await this.loyaltyRepository.getCampaign(
                tenantId,
                campaignId!,
            );
            if (!campaign || campaign.status === LoyaltyCampaignStatus.DRAFT) {
                throw new EntityNotFoundError("LoyaltyCampaign", campaignId!);
            }
            const claim =
                campaign.status === LoyaltyCampaignStatus.ARCHIVED
                    ? await this.loyaltyRepository.findCampaignRewardClaim(
                          tenantId,
                          campaign.id,
                          userId,
                      )
                    : undefined;
            if (
                campaign.status === LoyaltyCampaignStatus.ARCHIVED &&
                !claim
            ) {
                throw new EntityNotFoundError("LoyaltyCampaign", campaignId!);
            }
            return Success(
                await buildLoyaltyCampaignCustomerSummary(
                    this.loyaltyRepository,
                    tenantId,
                    campaign,
                    userId,
                    new Date(),
                    claim,
                ),
                "Loyalty campaign summary retrieved successfully",
            );
        }

        return this.executeLegacySummary(tenant, tenantId, userId);
    }

    async executeCampaign(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>> {
        return this.execute(tenantId, campaignId, userId);
    }

    async executeCustomerCampaign(
        tenantId: string,
        userId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>> {
        return this.executeCampaign(tenantId, campaignId, userId);
    }

    async executeForUser(
        tenantId: string,
        userId: string,
        campaignId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>> {
        return this.executeCampaign(tenantId, campaignId, userId);
    }

    async executeList(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary[]>> {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);
        assertLoyaltyCampaignFeatures(
            await this.featureRepository.getTenantFeatureStatus(tenantId),
        );
        const campaigns = await this.loyaltyRepository.listCampaigns(tenantId);
        const summaries = await Promise.all(
            campaigns.map(async (campaign) => {
                if (campaign.status === LoyaltyCampaignStatus.DRAFT) {
                    return null;
                }
                const claim =
                    campaign.status === LoyaltyCampaignStatus.ARCHIVED
                        ? await this.loyaltyRepository.findCampaignRewardClaim(
                              tenantId,
                              campaign.id,
                              userId,
                          )
                        : undefined;
                if (
                    campaign.status === LoyaltyCampaignStatus.ARCHIVED &&
                    !claim
                ) {
                    return null;
                }
                return buildLoyaltyCampaignCustomerSummary(
                    this.loyaltyRepository,
                    tenantId,
                    campaign,
                    userId,
                    new Date(),
                    claim,
                );
            }),
        );
        return Success(
            summaries.filter(
                (summary): summary is LoyaltyCampaignCustomerSummary =>
                    summary !== null,
            ),
            "Loyalty campaign summaries retrieved successfully",
        );
    }

    private async executeLegacySummary(
        tenant: { config?: { loyalty?: { targetPoints?: number; rewardCouponId?: string | null } } },
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<any>> {
        const config = tenant.config?.loyalty;
        const [points, claim] = await Promise.all([
            this.loyaltyRepository.getPointsBalance(tenantId, userId),
            this.loyaltyRepository.findRewardClaim(tenantId, userId),
        ]);
        const targetPoints = claim?.milestone ??
            (isValidLoyaltyTargetPoints(config?.targetPoints)
                ? config!.targetPoints!
                : DEFAULT_LOYALTY_TARGET_POINTS);
        const remaining = claim ? 0 : Math.max(targetPoints - points, 0);
        const status = claim
            ? LoyaltyStatus.CLAIMED
            : !config?.rewardCouponId
              ? LoyaltyStatus.NOT_CONFIGURED
              : points >= targetPoints
                ? LoyaltyStatus.READY
                : LoyaltyStatus.IN_PROGRESS;
        return Success(
            {
                points,
                targetPoints,
                remaining,
                status,
                ...(claim?.coupon ? { coupon: claim.coupon } : {}),
            },
            "Loyalty summary retrieved successfully",
        );
    }
}

export class GetCustomerLoyaltyCampaignUseCase {
    constructor(private summaryUseCase: GetCustomerLoyaltySummaryUseCase) {}

    execute(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>> {
        return this.summaryUseCase.executeCampaign(
            tenantId,
            campaignId,
            userId,
        );
    }
}

export class GetCustomerLoyaltyCampaignsUseCase {
    constructor(private summaryUseCase: GetCustomerLoyaltySummaryUseCase) {}

    async execute(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary[]>> {
        return this.summaryUseCase.executeList(tenantId, userId);
    }
}
