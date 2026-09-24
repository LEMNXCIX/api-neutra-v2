import type { Coupon } from "@/core/entities/coupon.entity";

export const DEFAULT_LOYALTY_TARGET_POINTS = 10;
export const LOYALTY_REWARD_MILESTONE = 10;

export function isValidLoyaltyTargetPoints(
    value: unknown,
): value is number {
    return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
    );
}

export interface LoyaltyConfig {
    targetPoints?: number;
    rewardCouponId?: string | null;
}

export interface ParsedLoyaltyConfig {
    targetPoints: number;
    rewardCouponId?: string;
}

export enum LoyaltyRewardClaimStatus {
    CLAIMED = "CLAIMED",
}

export enum LoyaltyStatus {
    IN_PROGRESS = "IN_PROGRESS",
    READY = "READY",
    CLAIMED = "CLAIMED",
    NOT_CONFIGURED = "NOT_CONFIGURED",
}

export interface LoyaltySummary {
    points: number;
    targetPoints: number;
    remaining: number;
    status: LoyaltyStatus;
    coupon?: Coupon;
}

export interface LoyaltyTenantStats {
    tenantId: string;
    totalPoints: number;
    totalClaims: number;
    activeCustomers: number;
}

export interface LoyaltyLedgerEntry {
    id: string;
    tenantId: string;
    userId: string;
    sourceAppointmentId: string;
    points: number;
    reason: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface LoyaltyRewardClaim {
    id: string;
    tenantId: string;
    userId: string;
    milestone: number;
    couponId: string;
    status: LoyaltyRewardClaimStatus;
    createdAt: Date;
    updatedAt: Date;
    coupon?: Coupon;
}

// Keep the JSON config shape typed without changing the legacy TenantConfig owner.
declare module "@/core/entities/tenant.entity" {
    interface TenantConfig {
        loyalty?: LoyaltyConfig;
    }
}
