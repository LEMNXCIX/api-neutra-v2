import {
    CouponResponse,
    type ICouponResponse,
} from "@/core/application/dtos/responses/coupon/coupon.response";
import type { Coupon, CouponType } from "@/core/entities/coupon.entity";
import type {
    LoyaltyCampaign,
    LoyaltyCampaignCustomerSummary,
    LoyaltyCampaignMetric,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyRewardClaimStatus,
    LoyaltyStatus,
} from "@/core/entities/loyalty.entity";

export interface ILoyaltyCampaignResponse {
    id: string;
    tenantId: string;
    name: string;
    description?: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    status: LoyaltyCampaignStatus;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId?: string | null;
    reward?: ILoyaltyCampaignRewardResponse;
    rewardValidDays?: number | null;
    maxClaims?: number | null;
    claimedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface ILoyaltyCampaignRewardResponse {
    type: CouponType;
    value: number;
    description?: string | null;
    minPurchaseAmount?: number | null;
    maxDiscountAmount?: number | null;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
}

export interface ILoyaltyCustomerCampaignSummaryResponse {
    campaignId: string;
    name: string;
    source: LoyaltyCampaignSource;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    metric: LoyaltyCampaignMetric;
    progressValue: string;
    targetValue: string;
    remainingValue: string;
    lifecycleStatus: LoyaltyCampaignStatus;
    customerStatus: LoyaltyStatus;
    progress?: string;
    target?: string;
    remaining?: string;
    status?: LoyaltyStatus;
    campaignStatus?: LoyaltyCampaignStatus;
    claim?: ILoyaltyCampaignClaimMetadataResponse;
    coupon?: ICouponResponse;
}

export interface ILoyaltyCampaignClaimMetadataResponse {
    id: string;
    campaignId: string;
    couponId: string;
    status: LoyaltyRewardClaimStatus;
    createdAt: Date;
    updatedAt: Date;
}

export interface ILoyaltyCampaignClaimResponse
    extends ILoyaltyCampaignClaimMetadataResponse {
    coupon: ICouponResponse;
}

export interface ILoyaltyTenantCampaignOverviewResponse {
    tenantId: string;
    name: string;
    slug: string;
    type: string;
    active: boolean;
    campaigns: ILoyaltyCampaignResponse[];
    stats: {
        campaignCount: number;
        activeCampaignCount: number;
        endedCampaignCount: number;
        archivedCampaignCount: number;
        totalClaims: number;
    };
}

export class LoyaltyPresenter {
    static toCampaignResponse(
        campaign: LoyaltyCampaign,
    ): ILoyaltyCampaignResponse {
        return {
            id: campaign.id,
            tenantId: campaign.tenantId,
            name: campaign.name,
            description: campaign.description,
            source: campaign.source,
            metric: campaign.metric,
            targetValue: campaign.targetValue,
            status: campaign.status,
            startsAt: campaign.startsAt,
            endsAt: campaign.endsAt,
            claimUntil: campaign.claimUntil,
            rewardCouponId: campaign.rewardCouponId,
            ...(campaign.reward
                ? {
                      reward: LoyaltyPresenter.toCampaignRewardResponse(
                          campaign.reward,
                      ),
                  }
                : {}),
            rewardValidDays: campaign.rewardValidDays,
            maxClaims: campaign.maxClaims,
            claimedCount: campaign.claimedCount,
            createdAt: campaign.createdAt,
            updatedAt: campaign.updatedAt,
        };
    }

    static toCampaignRewardResponse(
        reward: NonNullable<LoyaltyCampaign["reward"]>,
    ): ILoyaltyCampaignRewardResponse {
        return {
            type: reward.type,
            value: reward.value,
            description: reward.description,
            minPurchaseAmount: reward.minPurchaseAmount,
            maxDiscountAmount: reward.maxDiscountAmount,
            applicableProducts: [...reward.applicableProducts],
            applicableCategories: [...reward.applicableCategories],
            applicableServices: [...reward.applicableServices],
        };
    }

    static toCampaignListResponse(
        campaigns: LoyaltyCampaign[],
    ): ILoyaltyCampaignResponse[] {
        return campaigns.map((campaign) =>
            LoyaltyPresenter.toCampaignResponse(campaign),
        );
    }

    static toCustomerCampaignSummaryResponse(
        summary: LoyaltyCampaignCustomerSummary,
    ): ILoyaltyCustomerCampaignSummaryResponse {
        return {
            campaignId: summary.campaignId,
            name: summary.name,
            source: summary.source,
            startsAt: summary.startsAt,
            endsAt: summary.endsAt,
            claimUntil: summary.claimUntil,
            metric: summary.metric,
            progressValue: summary.progressValue,
            targetValue: summary.targetValue,
            remainingValue: summary.remainingValue,
            lifecycleStatus: summary.lifecycleStatus,
            customerStatus: summary.customerStatus,
            progress: summary.progress ?? summary.progressValue,
            target: summary.target ?? summary.targetValue,
            remaining: summary.remaining ?? summary.remainingValue,
            status: summary.status ?? summary.customerStatus,
            campaignStatus: summary.campaignStatus ?? summary.lifecycleStatus,
            ...(summary.claim
                ? {
                      claim: {
                          id: summary.claim.id,
                          campaignId: summary.claim.campaignId,
                          couponId: summary.claim.couponId,
                          status: summary.claim.status,
                          createdAt: summary.claim.createdAt,
                          updatedAt: summary.claim.updatedAt,
                      },
                  }
                : {}),
            ...(summary.coupon
                ? { coupon: CouponResponse.fromEntity(summary.coupon) }
                : {}),
        };
    }

    static toCustomerCampaignSummaryListResponse(
        summaries: LoyaltyCampaignCustomerSummary[],
    ): ILoyaltyCustomerCampaignSummaryResponse[] {
        return summaries.map((summary) =>
            LoyaltyPresenter.toCustomerCampaignSummaryResponse(summary),
        );
    }

    static toCampaignClaimResponse(
        claim: LoyaltyCampaignRewardClaim,
        coupon?: Coupon,
    ): ILoyaltyCampaignClaimResponse {
        const rewardCoupon = coupon ?? claim.coupon;
        if (!rewardCoupon) {
            throw new Error("Loyalty campaign claim coupon is missing");
        }
        return {
            id: claim.id,
            campaignId: claim.campaignId,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            updatedAt: claim.updatedAt,
            coupon: CouponResponse.fromEntity(rewardCoupon),
        };
    }

    static toTenantCampaignOverviewResponse(overview: {
        tenantId: string;
        name: string;
        slug: string;
        type: string;
        active: boolean;
        campaigns: LoyaltyCampaign[];
        stats: ILoyaltyTenantCampaignOverviewResponse["stats"];
    }): ILoyaltyTenantCampaignOverviewResponse {
        return {
            tenantId: overview.tenantId,
            name: overview.name,
            slug: overview.slug,
            type: overview.type,
            active: overview.active,
            campaigns: LoyaltyPresenter.toCampaignListResponse(
                overview.campaigns,
            ),
            stats: overview.stats,
        };
    }
}

export type ICampaignResponse = ILoyaltyCampaignResponse;
export type LoyaltyCampaignResponse = ILoyaltyCampaignResponse;
export type ICustomerLoyaltyCampaignSummaryResponse =
    ILoyaltyCustomerCampaignSummaryResponse;
export type LoyaltyCustomerCampaignSummaryResponse =
    ILoyaltyCustomerCampaignSummaryResponse;
export type ICampaignClaimResponse = ILoyaltyCampaignClaimResponse;
export type LoyaltyCampaignClaimResponse = ILoyaltyCampaignClaimResponse;
export type ITenantLoyaltyCampaignOverviewResponse =
    ILoyaltyTenantCampaignOverviewResponse;
export type LoyaltyTenantCampaignOverviewResponse =
    ILoyaltyTenantCampaignOverviewResponse;
