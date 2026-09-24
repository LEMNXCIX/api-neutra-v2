import {
    LoyaltyLedgerEntry,
    LoyaltyRewardClaim,
    LoyaltyTenantStats,
} from "@/core/entities/loyalty.entity";
import { Coupon } from "@/core/entities/coupon.entity";

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
