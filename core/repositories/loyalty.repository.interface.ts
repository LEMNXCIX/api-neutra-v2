import { Coupon } from "@/core/entities/coupon.entity";
import {
    LoyaltyCampaign,
    LoyaltyCampaignMetric,
    LoyaltyCampaignProgress,
    LoyaltyCampaignReward,
    LoyaltyCampaignRewardClaim,
    LoyaltyCampaignSource,
    LoyaltyCampaignStats,
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
    getCampaignStats(
        tenantId: string,
        campaignId: string,
    ): Promise<LoyaltyCampaignStats>;
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
