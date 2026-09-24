import { TenantType } from "@/core/entities/tenant.entity";
import type { Coupon } from "@/core/entities/coupon.entity";

export const DEFAULT_LOYALTY_TARGET_POINTS = 10;
export const LOYALTY_REWARD_MILESTONE = 10;
export const MAX_LOYALTY_PRISMA_INT = 2_147_483_647;

const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;
const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;

export function isValidLoyaltyTargetPoints(
    value: unknown,
): value is number {
    return (
        typeof value === "number" &&
        Number.isSafeInteger(value) &&
        value > 0
    );
}

export function isValidPositiveDecimalString(
    value: unknown,
): value is string {
    return (
        typeof value === "string" &&
        POSITIVE_DECIMAL_PATTERN.test(value) &&
        !/^0(?:\.0{1,2})?$/.test(value)
    );
}

export function isValidLoyaltyCampaignTarget(
    metric: LoyaltyCampaignMetric,
    value: unknown,
): value is string {
    if (!isValidPositiveDecimalString(value)) return false;
    if (metric === LoyaltyCampaignMetric.SPEND) return true;
    if (metric !== LoyaltyCampaignMetric.COUNT) return false;

    const normalized = normalizeDecimalString(value);
    return normalized !== null && normalized.endsWith(".00");
}

export function isValidLoyaltyCampaignMaxClaims(
    value: unknown,
): value is number {
    return (
        Number.isSafeInteger(value) &&
        Number(value) > 0 &&
        Number(value) <= MAX_LOYALTY_PRISMA_INT
    );
}

export function isValidLoyaltyRewardValidDays(
    value: unknown,
): value is number {
    return (
        Number.isSafeInteger(value) &&
        Number(value) > 0 &&
        Number(value) <= MAX_LOYALTY_PRISMA_INT
    );
}

export function isValidCampaignDate(value: unknown): value is Date {
    return value instanceof Date && Number.isFinite(value.getTime());
}

export function isValidLoyaltyCampaignDates(
    startsAt: unknown,
    endsAt: unknown,
    claimUntil: unknown,
): startsAt is Date {
    return (
        isValidCampaignDate(startsAt) &&
        isValidCampaignDate(endsAt) &&
        isValidCampaignDate(claimUntil) &&
        startsAt.getTime() < endsAt.getTime() &&
        endsAt.getTime() <= claimUntil.getTime()
    );
}

export function canTransitionLoyaltyCampaignStatus(
    from: LoyaltyCampaignStatus,
    to: LoyaltyCampaignStatus,
): boolean {
    const transitions: Record<LoyaltyCampaignStatus, LoyaltyCampaignStatus[]> = {
        [LoyaltyCampaignStatus.DRAFT]: [LoyaltyCampaignStatus.ACTIVE],
        [LoyaltyCampaignStatus.ACTIVE]: [LoyaltyCampaignStatus.ENDED],
        [LoyaltyCampaignStatus.ENDED]: [LoyaltyCampaignStatus.ARCHIVED],
        [LoyaltyCampaignStatus.ARCHIVED]: [],
    };
    return transitions[from]?.includes(to) ?? false;
}

export function getEffectiveLoyaltyCampaignStatus(
    status: LoyaltyCampaignStatus,
    startsAt: Date,
    endsAt: Date,
    now: Date,
): LoyaltyCampaignStatus {
    if (
        !isValidLoyaltyCampaignDates(startsAt, endsAt, endsAt) ||
        !isValidCampaignDate(now)
    ) {
        throw new TypeError("Campaign lifecycle dates must be valid");
    }

    return status === LoyaltyCampaignStatus.ACTIVE &&
        now.getTime() >= endsAt.getTime()
        ? LoyaltyCampaignStatus.ENDED
        : status;
}

export function isLoyaltyCampaignClaimable(
    status: LoyaltyCampaignStatus,
    startsAt: Date,
    claimUntil: Date,
    now: Date,
): boolean {
    return (
        (status === LoyaltyCampaignStatus.ACTIVE ||
            status === LoyaltyCampaignStatus.ENDED) &&
        isValidCampaignDate(startsAt) &&
        isValidCampaignDate(claimUntil) &&
        isValidCampaignDate(now) &&
        now.getTime() >= startsAt.getTime() &&
        now.getTime() < claimUntil.getTime()
    );
}

export function getLoyaltyCampaignContributionValue(
    input: LoyaltyCampaignContributionInput,
): string {
    if (input.metric === LoyaltyCampaignMetric.COUNT) return "1.00";
    if (input.metric !== LoyaltyCampaignMetric.SPEND) {
        throw new TypeError("Unsupported loyalty campaign metric");
    }
    return normalizeNonNegativeDecimal(input.netTotal);
}

export function getLoyaltyCampaignProgressValue(
    metric: LoyaltyCampaignMetric,
    netTotal: string,
): string {
    const normalized = normalizeNonNegativeDecimal(netTotal);
    if (
        metric === LoyaltyCampaignMetric.COUNT &&
        !normalized.endsWith(".00")
    ) {
        throw new TypeError("COUNT campaign progress must be an integer");
    }
    if (
        metric !== LoyaltyCampaignMetric.COUNT &&
        metric !== LoyaltyCampaignMetric.SPEND
    ) {
        throw new TypeError("Unsupported loyalty campaign metric");
    }
    return normalized;
}

export function isLoyaltyCampaignSourceCompatible(
    tenantType: TenantType,
    source: LoyaltyCampaignSource,
): boolean {
    if (tenantType === TenantType.HYBRID) {
        return (
            source === LoyaltyCampaignSource.BOOKING ||
            source === LoyaltyCampaignSource.STORE ||
            source === LoyaltyCampaignSource.ALL
        );
    }
    if (tenantType === TenantType.STORE) {
        return source === LoyaltyCampaignSource.STORE;
    }
    if (tenantType === TenantType.BOOKING) {
        return source === LoyaltyCampaignSource.BOOKING;
    }
    return false;
}

function normalizeNonNegativeDecimal(value: string): string {
    const normalized = normalizeDecimalString(value);
    if (normalized === null) {
        throw new TypeError("Campaign progress must be a fixed decimal value");
    }
    return normalized.startsWith("-") ? "0.00" : normalized;
}

function normalizeDecimalString(value: string): string | null {
    if (!DECIMAL_PATTERN.test(value)) return null;
    const negative = value.startsWith("-");
    const unsigned = negative ? value.slice(1) : value;
    const [whole, fraction = ""] = unsigned.split(".");
    const normalized = `${whole}.${fraction.padEnd(2, "0")}`;
    if (normalized.startsWith("0.") && /^0\.0{2}$/.test(normalized)) {
        return "0.00";
    }
    return negative ? `-${normalized}` : normalized;
}

export interface LoyaltyConfig {
    targetPoints?: number;
    rewardCouponId?: string | null;
}

export interface ParsedLoyaltyConfig {
    targetPoints: number;
    rewardCouponId?: string;
}

export enum LoyaltyCampaignStatus {
    DRAFT = "DRAFT",
    ACTIVE = "ACTIVE",
    ENDED = "ENDED",
    ARCHIVED = "ARCHIVED",
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

export interface LoyaltyCampaign {
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
    rewardValidDays?: number;
    maxClaims?: number;
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
