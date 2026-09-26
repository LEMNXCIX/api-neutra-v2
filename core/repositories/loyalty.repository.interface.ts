import { Coupon } from "@/core/entities/coupon.entity";
import {
    LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignProgress,
    LoyaltyCampaignReward,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
} from "@/core/entities/loyalty.entity";

export type LoyaltyCampaignRewardDefinition = LoyaltyCampaignReward;

export type CreateLoyaltyCampaignData = {
    name: string;
    description?: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    reward: LoyaltyCampaignReward;
    rewardValidDays: number;
    maxClaims?: number | null;
};

export type UpdateLoyaltyCampaignData = Partial<
    Omit<CreateLoyaltyCampaignData, "reward" | "rewardValidDays">
> & {
    reward?: LoyaltyCampaignReward;
    rewardValidDays?: number;
};

export type LoyaltyCampaignClaimResult = {
    claim: LoyaltyCampaignRewardClaim;
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
    getCampaignProgress(
        tenantId: string,
        campaignId: string,
        userId: string,
        knownCampaign?: LoyaltyCampaign,
    ): Promise<LoyaltyCampaignProgress>;
    /**
     * Progress for every campaign in one pass, so a caller holding a list of
     * campaigns does not pay two ledger reads per COUNT campaign and one per
     * SPEND campaign. Returns one entry per campaign, including the campaigns
     * with no ledger activity, which report zero exactly as the single-campaign
     * path does.
     */
    getCampaignsProgressForCustomer(
        tenantId: string,
        userId: string,
        campaigns: LoyaltyCampaign[],
    ): Promise<LoyaltyCampaignProgress[]>;
    /**
     * Every reward claim this customer holds across the given campaigns, in
     * one read. Campaigns with no claim are absent from the result.
     */
    findCampaignRewardClaimsForCustomer(
        tenantId: string,
        userId: string,
        campaignIds: string[],
    ): Promise<LoyaltyCampaignRewardClaim[]>;
    /**
     * How many reward claims the tenant holds, in one read.
     */
    countCampaignRewardClaims(tenantId: string): Promise<number>;
    findCampaignRewardClaim(
        tenantId: string,
        campaignId: string,
        userId: string,
    ): Promise<LoyaltyCampaignRewardClaim | null>;
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
}
