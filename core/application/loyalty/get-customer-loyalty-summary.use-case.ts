import {
    EntityNotFoundError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    assertLoyaltyCampaignFeatures,
    getEffectiveLoyaltyCampaignStatus,
    getLoyaltyCampaignCustomerStatus,
    getLoyaltyCampaignProgressValue,
    getLoyaltyCampaignRemainingValue,
} from "@/core/domain/loyalty/loyalty.policy";
import {
    type LoyaltyCampaign,
    type LoyaltyCampaignCustomerSummary,
    type LoyaltyCampaignProgress,
    type LoyaltyCampaignRewardClaim,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import type { ILoyaltyRepository } from "@/core/repositories/loyalty.repository.interface";
import type { ITenantRepository } from "@/core/repositories/tenant.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";
import { ValidationErrorCodes } from "@/types/error-codes";

function validateIdentity(...values: string[]): void {
    if (values.some((value) => !value?.trim())) {
        throw new ValidationError(
            "Tenant, campaign, and customer identity are required",
            ValidationErrorCodes.MISSING_REQUIRED_FIELDS,
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
    knownProgress?: LoyaltyCampaignProgress,
): Promise<LoyaltyCampaignCustomerSummary> {
    const progress =
        knownProgress ??
        (await loyaltyRepository.getCampaignProgress(
            tenantId,
            campaign.id,
            userId,
            campaign,
        ));
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
        name: campaign.name,
        source: campaign.source,
        startsAt: campaign.startsAt,
        endsAt: campaign.endsAt,
        claimUntil: campaign.claimUntil,
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
        const allCampaigns =
            await this.loyaltyRepository.listCampaigns(tenantId);
        // A DRAFT campaign is invisible, and an ARCHIVED one only exists for a
        // customer who already claimed it. Both are dropped before any ledger
        // or claim read, so neither costs a query.
        const visible = allCampaigns.filter(
            (campaign) => campaign.status !== LoyaltyCampaignStatus.DRAFT,
        );
        const archivedIds = visible
            .filter(
                (campaign) =>
                    campaign.status === LoyaltyCampaignStatus.ARCHIVED,
            )
            .map((campaign) => campaign.id);
        // One ledger read per (metric, source) pair and one claim read for every
        // archived campaign, instead of two ledger reads per COUNT campaign,
        // one per SPEND campaign and one claim read per archived campaign.
        const [progressByCampaign, archivedClaims] = await Promise.all([
            this.loyaltyRepository.getCampaignsProgressForCustomer(
                tenantId,
                userId,
                visible,
            ),
            this.loyaltyRepository.findCampaignRewardClaimsForCustomer(
                tenantId,
                userId,
                archivedIds,
            ),
        ]);
        const claimByCampaign = new Map(
            archivedClaims.map((claim) => [claim.campaignId, claim]),
        );

        const summaries = (
            await Promise.all(
                visible.map((campaign) => {
                    if (
                        campaign.status === LoyaltyCampaignStatus.ARCHIVED &&
                        !claimByCampaign.has(campaign.id)
                    ) {
                        return null;
                    }
                    // `null`, not `undefined`: a non-archived campaign has no
                    // claim by definition, and `undefined` is the "not looked
                    // up, fetch it" signal that would send us back to the
                    // database.
                    const knownClaim =
                        campaign.status === LoyaltyCampaignStatus.ARCHIVED
                            ? (claimByCampaign.get(campaign.id) ?? null)
                            : null;
                    return buildLoyaltyCampaignCustomerSummary(
                        this.loyaltyRepository,
                        tenantId,
                        campaign,
                        userId,
                        now,
                        knownClaim,
                        progressByCampaign.find(
                            (progress) => progress.campaignId === campaign.id,
                        ),
                    );
                }),
            )
        ).filter(
            (summary): summary is LoyaltyCampaignCustomerSummary =>
                summary !== null,
        );

        return Success(
            summaries,
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
