import type { Coupon, CouponType } from "@/core/entities/coupon.entity";

export enum LoyaltyCampaignStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    ENDED = "ENDED",
    ARCHIVED = "ARCHIVED",
}

export enum LoyaltyCampaignAction {
    ACTIVATE = "activate",
    END = "end",
    ARCHIVE = "archive",
    DELETE = "delete",
}

export enum LoyaltyCampaignSource {
    BOOKING = "BOOKING",
    STORE = "STORE",
    ALL = "ALL",
}

export enum LoyaltyCampaignMetric {
    COUNT = "COUNT",
    SPEND = "SPEND",
}

export enum LoyaltySourceType {
    APPOINTMENT = "APPOINTMENT",
    ORDER = "ORDER",
}

export enum LoyaltyLedgerEntryType {
    ACCRUAL = "ACCRUAL",
    REVERSAL = "REVERSAL",
}

export enum LoyaltyRewardClaimStatus {
    CLAIMED = "CLAIMED",
}

export enum LoyaltyStatus {
    NOT_STARTED = "NOT_STARTED",
    IN_PROGRESS = "IN_PROGRESS",
    READY = "READY",
    CLAIMED = "CLAIMED",
    EXPIRED = "EXPIRED",
}

export const LoyaltyCampaignCustomerStatus = LoyaltyStatus;
export type LoyaltyCampaignCustomerStatus = LoyaltyStatus;

export interface LoyaltyCampaignReward {
    type: CouponType;
    value: number;
    description: string | null;
    minPurchaseAmount: number | null;
    maxDiscountAmount: number | null;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
}

export interface LoyaltyCampaign {
    id: string;
    tenantId: string;
    name: string;
    description: string | null;
    source: LoyaltyCampaignSource;
    metric: LoyaltyCampaignMetric;
    targetValue: string;
    status: LoyaltyCampaignStatus;
    startsAt: Date;
    endsAt: Date;
    claimUntil: Date;
    rewardCouponId: string | null;
    reward?: LoyaltyCampaignReward;
    rewardValidDays: number | null;
    maxClaims: number | null;
    claimedCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyCampaignLedgerEntry {
    id: string;
    tenantId: string;
    campaignId: string;
    userId: string;
    sourceType: LoyaltySourceType;
    sourceId: string;
    value: string;
    entryType: LoyaltyLedgerEntryType;
    reversalOfId?: string;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyCampaignContributionInput {
    metric: LoyaltyCampaignMetric;
    netTotal: string;
}

export interface LoyaltyCampaignProgress {
    campaignId: string;
    userId: string;
    metric: LoyaltyCampaignMetric;
    progressValue: string;
    targetValue: string;
    reachedTarget: boolean;
}

export interface LoyaltyCampaignCustomerSummary {
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
    /** Short aliases used by API consumers. */
    progress?: string;
    target?: string;
    remaining?: string;
    status?: LoyaltyStatus;
    campaignStatus?: LoyaltyCampaignStatus;
    coupon?: Coupon;
    claim?: LoyaltyCampaignRewardClaim;
}

export interface LoyaltyCampaignStats {
    campaignId: string;
    claimedCount: number;
    maxClaims: number | null;
    remainingClaims: number | null;
}

export interface LoyaltyCampaignRewardClaim {
    id: string;
    tenantId: string;
    campaignId: string;
    userId: string;
    couponId: string;
    status: LoyaltyRewardClaimStatus;
    createdAt: Date;
    updatedAt: Date;
    coupon?: Coupon;
}
