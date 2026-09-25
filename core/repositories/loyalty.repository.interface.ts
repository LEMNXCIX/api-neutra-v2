import {
    LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignProgress,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStats,
    LoyaltyCampaignStatus,
    LoyaltyLedgerEntry,
    LoyaltySourceType,
    LoyaltyRewardClaim,
    LoyaltyTenantStats,
} from "@/core/entities/loyalty.entity";
import { Coupon } from "@/core/entities/coupon.entity";

export type CreateLoyaltyCampaignData = {
    name: string;
    description?: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId: string;
    rewardValidDays: number;
    maxClaims?: number | null;
};

export type UpdateLoyaltyCampaignData = Partial<
    Omit<CreateLoyaltyCampaignData, "rewardCouponId" | "rewardValidDays">
> & {
    rewardCouponId?: string;
    rewardValidDays?: number;
};

export type LoyaltyCampaignClaimResult = {
    claim: LoyaltyCampaignRewardClaim;
    coupon: Coupon;
};

export type CreateLoyaltyLedgerEntryData = {
    userId: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt?: Date;
};

export type LoyaltyRewardClaimResult = {
    claim: LoyaltyRewardClaim;
    coupon: Coupon;
};

export interface ILoyaltyRepository {
    createCampaign(
        tenantId: string,
        data: CreateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign>;
    updateCampaign(
        tenantId: string,
        campaignId: string,
        data: UpdateLoyaltyCampaignData,
    ): Promise<LoyaltyCampaign>;
    deleteCampaign(tenantId: string, campaignId: string): Promise<void>;
    listCampaigns(tenantId: string): Promise<LoyaltyCampaign[]>;
    hasLiveLoyaltyObligations(tenantId: string): Promise<boolean>;
    getCampaign(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaign | null>;
    findActiveCampaignAt(
        tenantId: string,
        sourceType: LoyaltySourceType,
        at: Date,
    ): Promise<LoyaltyCampaign | null>;
    getCampaignProgress(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignProgress>;
    getCampaignStats(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaignStats>;
    transitionCampaignStatus(
        tenantId: string,
        campaignId: string,
        from: LoyaltyCampaignStatus,
        to: LoyaltyCampaignStatus,
    ): Promise<LoyaltyCampaign | null>;
    claimCampaignReward(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignClaimResult>;
    findLedgerEntries(
        tenantId: string,
        userId?: string,
    ): Promise<LoyaltyLedgerEntry[]>;
    findLedgerEntryByAppointment(
        tenantId: string,
        sourceAppointmentId: string,
    ): Promise<LoyaltyLedgerEntry | null>;
    insertLedgerEntry(
        tenantId: string,
        data: CreateLoyaltyLedgerEntryData,
    ): Promise<LoyaltyLedgerEntry>;
    getPointsBalance(tenantId: string, userId: string): Promise<number>;
    findRewardClaim(
        tenantId: string,
        userId: string,
        /** @deprecated Claims are unique per tenant/user; the milestone is ignored. */
        _milestone?: number,
    ): Promise<LoyaltyRewardClaim | null>;
    findRecentLedgerEntries(
        tenantId: string,
        limit?: number,
    ): Promise<LoyaltyLedgerEntry[]>;
    findRecentRewardClaims(
        tenantId: string,
        limit?: number,
    ): Promise<LoyaltyRewardClaim[]>;
    getTenantStats(tenantId: string): Promise<LoyaltyTenantStats>;
    claimReward(
        tenantId: string,
        userId: string,
        templateCouponId: string,
        milestoneOrCode?: number | string,
        code?: string,
    ): Promise<LoyaltyRewardClaimResult>;
}

export { LOYALTY_REWARD_MILESTONE } from "@/core/entities/loyalty.entity";
