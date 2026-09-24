import { ValidationError } from "@/core/domain/errors/domain-errors";
import { parseLoyaltyConfig } from "@/core/application/loyalty/parse-loyalty-config";
import {
    DEFAULT_LOYALTY_TARGET_POINTS,
    LOYALTY_REWARD_MILESTONE,
    LoyaltyRewardClaimStatus,
} from "@/core/entities/loyalty.entity";

describe("loyalty configuration", () => {
    test("uses the MVP defaults when the section is absent", () => {
        expect(parseLoyaltyConfig(undefined)).toEqual({
            targetPoints: DEFAULT_LOYALTY_TARGET_POINTS,
        });
        expect(parseLoyaltyConfig({})).toEqual({
            targetPoints: 10,
        });
    });

    test("accepts and trims the configured target and coupon", () => {
        expect(
            parseLoyaltyConfig({
                loyalty: {
                    targetPoints: 10,
                    rewardCouponId: " coupon-1 ",
                },
            }),
        ).toEqual({ targetPoints: 10, rewardCouponId: "coupon-1" });
    });

    test("accepts the largest safe positive target", () => {
        expect(
            parseLoyaltyConfig({
                loyalty: { targetPoints: Number.MAX_SAFE_INTEGER },
            }),
        ).toEqual({ targetPoints: Number.MAX_SAFE_INTEGER });
    });

    test.each([
        { targetPoints: 0 },
        { targetPoints: 1.5 },
        { targetPoints: "10" },
        { targetPoints: Number.MAX_SAFE_INTEGER + 1 },
        { rewardCouponId: "" },
        { rewardCouponId: 42 },
    ])("rejects invalid loyalty values: %j", (value) => {
        expect(() => parseLoyaltyConfig({ loyalty: value })).toThrow(
            ValidationError,
        );
    });
});

describe("loyalty domain constants", () => {
    test("keeps the first reward milestone at ten points", () => {
        expect(DEFAULT_LOYALTY_TARGET_POINTS).toBe(10);
        expect(LOYALTY_REWARD_MILESTONE).toBe(10);
        expect(LoyaltyRewardClaimStatus.CLAIMED).toBe("CLAIMED");
    });
});
