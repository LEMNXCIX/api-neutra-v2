import { ValidationError } from "@/core/domain/errors/domain-errors";
import {
    DEFAULT_LOYALTY_TARGET_POINTS,
    isValidLoyaltyTargetPoints,
    ParsedLoyaltyConfig,
} from "@/core/entities/loyalty.entity";

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Parse only the small loyalty section used by the MVP. The rest of the
 * tenant config is intentionally left untouched.
 */
export function parseLoyaltyConfig(config: unknown): ParsedLoyaltyConfig {
    const root = isRecord(config) ? config : {};
    const raw = root.loyalty;

    if (raw === undefined || raw === null) {
        return { targetPoints: DEFAULT_LOYALTY_TARGET_POINTS };
    }

    if (!isRecord(raw)) {
        throw new ValidationError(
            "Loyalty configuration must be an object",
            "INVALID_LOYALTY_CONFIG",
        );
    }

    const targetPoints =
        raw.targetPoints === undefined
            ? DEFAULT_LOYALTY_TARGET_POINTS
            : raw.targetPoints;

    if (!isValidLoyaltyTargetPoints(targetPoints)) {
        throw new ValidationError(
            "Loyalty targetPoints must be a positive safe integer",
            "INVALID_LOYALTY_TARGET_POINTS",
        );
    }

    const rewardCouponId = raw.rewardCouponId;
    if (
        rewardCouponId !== undefined &&
        rewardCouponId !== null &&
        (typeof rewardCouponId !== "string" || rewardCouponId.trim() === "")
    ) {
        throw new ValidationError(
            "Loyalty rewardCouponId must be a non-empty string",
            "INVALID_LOYALTY_REWARD_COUPON",
        );
    }

    return {
        targetPoints,
        ...(typeof rewardCouponId === "string"
            ? { rewardCouponId: rewardCouponId.trim() }
            : {}),
    };
}

export const getLoyaltyConfig = parseLoyaltyConfig;
