import { Coupon, CouponType } from "@/core/entities/coupon.entity";
import {
    DEFAULT_LOYALTY_TARGET_POINTS,
    LoyaltyCampaign,
    LoyaltyCampaignCustomerSummary,
    LoyaltyConfig,
    LoyaltyLedgerEntry,
    LoyaltyRewardClaim,
    LoyaltyStatus,
    LoyaltyTenantStats,
    ParsedLoyaltyConfig,
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";
import { CouponPresenter } from "@/core/presenters/coupon.presenter";
import { ICouponResponse } from "@/core/application/dtos/responses/coupon/coupon.response";

export interface ILoyaltyConfigResponse {
    targetPoints: number;
    rewardCouponId: string | null;
}

export interface ILoyaltySummaryResponse {
    points: number;
    targetPoints: number;
    remaining: number;
    status: LoyaltyStatus;
    coupon?: ICouponResponse;
}

export interface ILoyaltyCampaignResponse {
    id: string;
    tenantId: string;
    name: string;
    description?: string;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    status: LoyaltyCampaignStatus;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId?: string;
    reward?: ILoyaltyCampaignRewardResponse;
    rewardValidDays?: number;
    maxClaims?: number;
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
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    updatedAt: Date;
}

export interface ILoyaltyCampaignClaimResponse
    extends ILoyaltyCampaignClaimMetadataResponse {
    id: string;
    campaignId: string;
    couponId: string;
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    updatedAt: Date;
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

export interface ILoyaltyClaimResponse {
    id: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    updatedAt: Date;
    coupon: ICouponResponse;
}

export interface ILoyaltyLedgerResponse {
    id: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt: Date;
}

export interface ILoyaltyClaimListResponse {
    id: string;
    userId: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaim["status"];
    createdAt: Date;
    coupon?: ICouponResponse;
}

export interface ILoyaltyTenantOverviewResponse {
    tenantId: string;
    name: string;
    slug: string;
    type: string;
    active: boolean;
    config: ILoyaltyConfigResponse;
    stats: LoyaltyTenantStats;
    recentLedger: ILoyaltyLedgerResponse[];
    recentClaims: ILoyaltyClaimListResponse[];
}

export class LoyaltyPresenter {
    static toConfigResponse(
        config: ParsedLoyaltyConfig | LoyaltyConfig,
    ): ILoyaltyConfigResponse {
        return {
            targetPoints:
                config.targetPoints ?? DEFAULT_LOYALTY_TARGET_POINTS,
            rewardCouponId: config.rewardCouponId ?? null,
        };
    }

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
                ? { reward: this.toCampaignRewardResponse(campaign.reward) }
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
        return campaigns.map((campaign) => this.toCampaignResponse(campaign));
    }

    static toCustomerSummaryResponse(
        summary: LoyaltyCampaignCustomerSummary,
    ): ILoyaltyCustomerCampaignSummaryResponse {
        return {
            campaignId: summary.campaignId,
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
            campaignStatus:
                summary.campaignStatus ?? summary.lifecycleStatus,
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
                ? { coupon: CouponPresenter.toResponse(summary.coupon) }
                : {}),
        };
    }

    static toCustomerCampaignSummaryResponse(
        summary: LoyaltyCampaignCustomerSummary,
    ): ILoyaltyCustomerCampaignSummaryResponse {
        return this.toCustomerSummaryResponse(summary);
    }

    static toCustomerCampaignResponse(
        summary: LoyaltyCampaignCustomerSummary,
    ): ILoyaltyCustomerCampaignSummaryResponse {
        return this.toCustomerSummaryResponse(summary);
    }

    static toCampaignClaimResponse(
        claim: {
            id: string;
            campaignId: string;
            couponId: string;
            status: LoyaltyRewardClaim["status"];
            createdAt: Date;
            updatedAt: Date;
        },
        coupon: Coupon = (claim as { coupon?: Coupon }).coupon!,
    ): ILoyaltyCampaignClaimResponse {
        return {
            id: claim.id,
            campaignId: claim.campaignId,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            updatedAt: claim.updatedAt,
            coupon: CouponPresenter.toResponse(coupon),
        };
    }

    static toLoyaltyCampaignClaimResponse(
        claim: {
            id: string;
            campaignId: string;
            couponId: string;
            status: LoyaltyRewardClaim["status"];
            createdAt: Date;
            updatedAt: Date;
        },
        coupon?: Coupon,
    ): ILoyaltyCampaignClaimResponse {
        return this.toCampaignClaimResponse(claim, coupon);
    }

    static toSummaryResponse(summary: {
        points: number;
        targetPoints: number;
        remaining: number;
        status: LoyaltyStatus;
        coupon?: Coupon;
    }): ILoyaltySummaryResponse {
        return {
            points: summary.points,
            targetPoints: summary.targetPoints,
            remaining: summary.remaining,
            status: summary.status,
            ...(summary.coupon
                ? { coupon: CouponPresenter.toResponse(summary.coupon) }
                : {}),
        };
    }

    static toClaimResponse(
        claim: LoyaltyRewardClaim,
        coupon: Coupon = claim.coupon!,
    ): ILoyaltyClaimResponse {
        return {
            id: claim.id,
            milestone: claim.milestone,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            updatedAt: claim.updatedAt,
            coupon: CouponPresenter.toResponse(coupon),
        };
    }

    static toLedgerResponse(
        entry: LoyaltyLedgerEntry,
    ): ILoyaltyLedgerResponse {
        return {
            id: entry.id,
            sourceAppointmentId: entry.sourceAppointmentId,
            points: entry.points,
            reason: entry.reason,
            createdAt: entry.createdAt,
        };
    }

    static toClaimListResponse(
        claim: LoyaltyRewardClaim,
    ): ILoyaltyClaimListResponse {
        return {
            id: claim.id,
            userId: claim.userId,
            milestone: claim.milestone,
            couponId: claim.couponId,
            status: claim.status,
            createdAt: claim.createdAt,
            ...(claim.coupon
                ? { coupon: CouponPresenter.toResponse(claim.coupon) }
                : {}),
        };
    }

    static toTenantCampaignOverviewResponse(
        overview: {
            tenantId: string;
            name: string;
            slug: string;
            type: string;
            active: boolean;
            campaigns: LoyaltyCampaign[];
            stats: ILoyaltyTenantCampaignOverviewResponse["stats"];
        },
    ): ILoyaltyTenantCampaignOverviewResponse {
        return {
            tenantId: overview.tenantId,
            name: overview.name,
            slug: overview.slug,
            type: overview.type,
            active: overview.active,
            campaigns: this.toCampaignListResponse(overview.campaigns),
            stats: overview.stats,
        };
    }

    static toTenantOverviewResponse(overview: {
        tenantId: string;
        name: string;
        slug: string;
        type: string;
        active: boolean;
        campaigns?: LoyaltyCampaign[];
        stats: LoyaltyTenantStats | ILoyaltyTenantCampaignOverviewResponse["stats"];
        config?: ParsedLoyaltyConfig;
        recentLedger?: LoyaltyLedgerEntry[];
        recentClaims?: LoyaltyRewardClaim[];
    }): ILoyaltyTenantOverviewResponse | ILoyaltyTenantCampaignOverviewResponse {
        if (overview.campaigns) {
            return this.toTenantCampaignOverviewResponse({
                tenantId: overview.tenantId,
                name: overview.name,
                slug: overview.slug,
                type: overview.type,
                active: overview.active,
                campaigns: overview.campaigns,
                stats: overview.stats as ILoyaltyTenantCampaignOverviewResponse["stats"],
            });
        }
        return {
            tenantId: overview.tenantId,
            name: overview.name,
            slug: overview.slug,
            type: overview.type,
            active: overview.active,
            config: LoyaltyPresenter.toConfigResponse(overview.config!),
            stats: overview.stats as LoyaltyTenantStats,
            recentLedger: (overview.recentLedger ?? []).map((entry) =>
                LoyaltyPresenter.toLedgerResponse(entry),
            ),
            recentClaims: (overview.recentClaims ?? []).map((claim) =>
                LoyaltyPresenter.toClaimListResponse(claim),
            ),
        };
    }
}

export class LoyaltyCampaignPresenter extends LoyaltyPresenter {}

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
