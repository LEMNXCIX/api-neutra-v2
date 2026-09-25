import {
    assertLoyaltyCampaignFeatures,
    getEffectiveLoyaltyCampaignStatus,
    getLoyaltyCampaignCustomerStatus,
    getLoyaltyCampaignProgressValue,
    getLoyaltyCampaignRemainingValue,
    LoyaltyCampaign,
    LoyaltyCampaignCustomerSummary,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

function validateIdentity(...values: string[]): void {
    if (values.some((value) => !value?.trim())) {
        throw new ValidationError(
            "Tenant, campaign, and customer identity are required",
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
        ...(claim
            ? {
                  claim,
                  ...(claim.coupon ? { coupon: claim.coupon } : {}),
              }
            : {}),
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
        campaignId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary>> {
        validateIdentity(tenantId, campaignId, userId);
        await this.assertTenantAccess(tenantId);

        const campaign = await this.loyaltyRepository.getCampaign(
            tenantId,
            campaignId,
        );
        if (!campaign || campaign.status === LoyaltyCampaignStatus.DRAFT) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
        }

        const claim =
            campaign.status === LoyaltyCampaignStatus.ARCHIVED
                ? await this.loyaltyRepository.findCampaignRewardClaim(
                      tenantId,
                      campaign.id,
                      userId,
                  )
                : undefined;
        if (campaign.status === LoyaltyCampaignStatus.ARCHIVED && !claim) {
            throw new EntityNotFoundError("LoyaltyCampaign", campaignId);
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

    async executeList(
        tenantId: string,
        userId: string,
    ): Promise<UseCaseResult<LoyaltyCampaignCustomerSummary[]>> {
        validateIdentity(tenantId, userId);
        await this.assertTenantAccess(tenantId);
        const now = new Date();
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
                    now,
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

    private async assertTenantAccess(tenantId: string): Promise<void> {
        const tenant = await this.tenantRepository.findById(tenantId);
        if (!tenant) throw new EntityNotFoundError("Tenant", tenantId);
        assertLoyaltyCampaignFeatures(
            await this.featureRepository.getTenantFeatureStatus(tenantId),
        );
    }
}
