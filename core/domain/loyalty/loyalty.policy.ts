import { TenantType } from "@/core/entities/tenant.entity";
import { CouponType } from "@/core/entities/coupon.entity";
import {
    BusinessRuleViolationError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";
import {
    LoyaltyCampaignContributionInput,
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltySourceType,
    LoyaltyStatus,
} from "@/core/entities/loyalty.entity";

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

const INVALID_REWARD_TEMPLATE = "INVALID_LOYALTY_REWARD_TEMPLATE";
const LOYALTY_CAMPAIGN_NOT_DRAFT = "LOYALTY_CAMPAIGN_NOT_DRAFT";

const REWARD_AMOUNT_FIELDS = [
    "minPurchaseAmount",
    "maxDiscountAmount",
] as const;
const REWARD_APPLICABILITY_FIELDS = [
    "applicableProducts",
    "applicableCategories",
    "applicableServices",
] as const;

/** The reward-template fields a caller may hold, normalized or not. */
interface LoyaltyRewardTemplate {
    type: CouponType;
    value: unknown;
    description?: unknown;
    minPurchaseAmount?: unknown;
    maxDiscountAmount?: unknown;
    applicableProducts?: unknown;
    applicableCategories?: unknown;
    applicableServices?: unknown;
}

function rewardTemplateRejected(message: string): ValidationError {
    return new ValidationError(message, INVALID_REWARD_TEMPLATE);
}

function rewardTemplateUnusable(message: string): BusinessRuleViolationError {
    return new BusinessRuleViolationError(message, INVALID_REWARD_TEMPLATE);
}

/**
 * The single entry point for reward-template validation. Checks run in a fixed
 * order — type, value, purchase bounds, description, applicability — and every
 * rejection carries INVALID_LOYALTY_REWARD_TEMPLATE.
 */
export function assertLoyaltyRewardTemplate(
    reward: LoyaltyRewardTemplate | null | undefined,
): void {
    if (!reward || !Object.values(CouponType).includes(reward.type)) {
        throw rewardTemplateRejected("Reward definition type is invalid");
    }
    const { value } = reward;
    if (
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        value <= 0 ||
        (reward.type === CouponType.PERCENT && value > 100)
    ) {
        throw rewardTemplateRejected("Reward definition value is invalid");
    }
    for (const field of REWARD_AMOUNT_FIELDS) {
        const amount = reward[field];
        if (
            amount !== undefined &&
            amount !== null &&
            (typeof amount !== "number" ||
                !Number.isFinite(amount) ||
                amount < 0)
        ) {
            throw rewardTemplateRejected(
                `Reward definition ${field} is invalid`,
            );
        }
    }
    if (
        reward.description !== undefined &&
        reward.description !== null &&
        typeof reward.description !== "string"
    ) {
        throw rewardTemplateRejected(
            "Reward definition description is invalid",
        );
    }
    for (const field of REWARD_APPLICABILITY_FIELDS) {
        const ids = reward[field];
        if (ids === undefined) continue;
        if (
            !Array.isArray(ids) ||
            ids.some(
                (id) => typeof id !== "string" || id.trim().length === 0,
            )
        ) {
            throw rewardTemplateRejected(
                `Reward definition ${field} is invalid`,
            );
        }
    }
}

/** A campaign cannot exist without the reward definition it promises. */
export function assertLoyaltyCampaignRewardProvided(
    reward: unknown,
): void {
    if (!reward) {
        throw rewardTemplateRejected(
            "Campaign reward definition is required",
        );
    }
}

/**
 * Activation and claim share one precondition: the campaign still points at a
 * reward template and its reward validity is a positive integer. The caller
 * keeps the message that names its own boundary.
 */
export function assertLoyaltyCampaignRewardConfigured(
    rewardCouponId: string | null | undefined,
    rewardValidDays: unknown,
    message: string,
): void {
    if (
        !rewardCouponId ||
        !isValidLoyaltyRewardValidDays(rewardValidDays)
    ) {
        throw rewardTemplateUnusable(message);
    }
}

/**
 * The reward template a transaction read or wrote no longer matches what the
 * caller expected. The caller owns the message; the code is owned here.
 */
export function rejectLoyaltyRewardTemplate(message: string): never {
    throw rewardTemplateUnusable(message);
}

/**
 * Campaigns may only be updated and deleted while DRAFT. Callers pass their own
 * evidence: a loaded status, or the row count of a DRAFT-scoped
 * compare-and-set, each rechecked at its own transaction boundary.
 */
export function assertLoyaltyCampaignDraft(
    isDraft: boolean,
    message: string,
): void {
    if (!isDraft) {
        throw new BusinessRuleViolationError(
            message,
            LOYALTY_CAMPAIGN_NOT_DRAFT,
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

