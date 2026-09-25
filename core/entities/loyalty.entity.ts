import { TenantType } from "@/core/entities/tenant.entity";
import type { Coupon, CouponType } from "@/core/entities/coupon.entity";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";

export const MAX_LOYALTY_PRISMA_INT = 2_147_483_647;

const POSITIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;
const DECIMAL_PATTERN = /^-?(?:0|[1-9]\d{0,15})(?:\.\d{1,2})?$/;

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

export function getLoyaltyCampaignSource(
    sourceType: LoyaltySourceType,
): LoyaltyCampaignSource {
    if (sourceType === LoyaltySourceType.APPOINTMENT) {
        return LoyaltyCampaignSource.BOOKING;
    }
    if (sourceType === LoyaltySourceType.ORDER) {
        return LoyaltyCampaignSource.STORE;
    }
    throw new TypeError("Unsupported loyalty campaign source type");
}

export function getLoyaltyCampaignSourceTypes(
    source: LoyaltyCampaignSource,
): LoyaltySourceType[] {
    if (source === LoyaltyCampaignSource.BOOKING) {
        return [LoyaltySourceType.APPOINTMENT];
    }
    if (source === LoyaltyCampaignSource.STORE) {
        return [LoyaltySourceType.ORDER];
    }
    if (source === LoyaltyCampaignSource.ALL) {
        return [LoyaltySourceType.APPOINTMENT, LoyaltySourceType.ORDER];
    }
    throw new TypeError("Unsupported loyalty campaign source");
}

export function assertLoyaltyCampaignFeatures(
    features: Record<string, boolean> | null | undefined,
): void {
    const resolved = features ?? {};
    if (resolved.LOYALTY !== true) {
        throw new BusinessRuleViolationError(
            "LOYALTY must be enabled for campaign administration",
            "LOYALTY_FEATURE_REQUIRED",
        );
    }
    if (resolved.COUPONS !== true) {
        throw new BusinessRuleViolationError(
            "LOYALTY requires COUPONS to be enabled for campaign administration",
            "LOYALTY_REQUIRES_COUPONS",
        );
    }
}

export function assertLoyaltyCampaignSourceCompatible(
    tenantType: TenantType,
    source: LoyaltyCampaignSource,
): void {
    if (!isLoyaltyCampaignSourceCompatible(tenantType, source)) {
        throw new BusinessRuleViolationError(
            "The campaign source is not supported by this tenant type",
            "LOYALTY_CAMPAIGN_SOURCE_NOT_COMPATIBLE",
        );
    }
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

function decimalStringToCents(value: string): bigint {
    const normalized = normalizeDecimalString(value);
    if (normalized === null) {
        throw new TypeError("Loyalty values must be fixed decimal strings");
    }
    const negative = normalized.startsWith("-");
    const unsigned = negative ? normalized.slice(1) : normalized;
    const [whole, fraction = "00"] = unsigned.split(".");
    const cents =
        BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0").slice(0, 2));
    return negative ? -cents : cents;
}

function centsToDecimalString(cents: bigint): string {
    const negative = cents < 0n;
    const absolute = negative ? -cents : cents;
    const whole = absolute / 100n;
    const fraction = (absolute % 100n).toString().padStart(2, "0");
    return `${negative ? "-" : ""}${whole}.${fraction}`;
}

/**
 * Subtracts two fixed two-decimal campaign values without floating point.
 * Remaining campaign value is a business quantity, so it never goes below zero.
 */
export function subtractLoyaltyDecimalStrings(
    value: string,
    subtrahend: string,
): string {
    const difference =
        decimalStringToCents(value) - decimalStringToCents(subtrahend);
    return centsToDecimalString(difference < 0n ? 0n : difference);
}

export const subtractDecimalStrings = subtractLoyaltyDecimalStrings;

export function getLoyaltyCampaignRemainingValue(
    progressValue: string,
    targetValue: string,
): string {
    return subtractLoyaltyDecimalStrings(targetValue, progressValue);
}

export const getLoyaltyCampaignRemaining = getLoyaltyCampaignRemainingValue;
export const calculateLoyaltyCampaignRemaining =
    getLoyaltyCampaignRemainingValue;

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

export function getLoyaltyCampaignCustomerStatus(input: {
    lifecycleStatus: LoyaltyCampaignStatus;
    startsAt: Date;
    claimUntil: Date;
    reachedTarget: boolean;
    claimed: boolean;
    now: Date;
}): LoyaltyStatus {
    if (input.claimed) return LoyaltyStatus.CLAIMED;
    if (
        input.lifecycleStatus === LoyaltyCampaignStatus.DRAFT ||
        input.now.getTime() < input.startsAt.getTime()
    ) {
        return LoyaltyStatus.NOT_STARTED;
    }
    if (
        input.lifecycleStatus === LoyaltyCampaignStatus.ARCHIVED ||
        input.now.getTime() >= input.claimUntil.getTime()
    ) {
        return LoyaltyStatus.EXPIRED;
    }
    return input.reachedTarget
        ? LoyaltyStatus.READY
        : LoyaltyStatus.IN_PROGRESS;
}

export interface LoyaltyCampaignReward {
    type: CouponType;
    value: number;
    description?: string | null;
    minPurchaseAmount?: number | null;
    maxDiscountAmount?: number | null;
    applicableProducts: string[];
    applicableCategories: string[];
    applicableServices: string[];
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
    reward?: LoyaltyCampaignReward;
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
