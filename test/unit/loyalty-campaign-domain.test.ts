import {
    canTransitionLoyaltyCampaignStatus,
    getEffectiveLoyaltyCampaignStatus,
    getLoyaltyCampaignContributionValue,
    getLoyaltyCampaignProgressValue,
    getLoyaltyCampaignSource,
    isLoyaltyCampaignClaimable,
    isLoyaltyCampaignSourceCompatible,
    isValidLoyaltyCampaignDates,
    isValidLoyaltyCampaignMaxClaims,
    isValidLoyaltyCampaignTarget,
    isValidLoyaltyRewardValidDays,
    isValidPositiveDecimalString,
    MAX_LOYALTY_PRISMA_INT,
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import { TenantType } from "@/core/entities/tenant.entity";

const startsAt = new Date("2030-01-01T00:00:00.000Z");
const endsAt = new Date("2030-01-10T00:00:00.000Z");
const claimUntil = new Date("2030-02-01T00:00:00.000Z");

describe("loyalty campaign domain validation", () => {
    test("accepts only ordered, valid campaign dates", () => {
        expect(
            isValidLoyaltyCampaignDates(startsAt, endsAt, claimUntil),
        ).toBe(true);
        expect(
            isValidLoyaltyCampaignDates(endsAt, startsAt, claimUntil),
        ).toBe(false);
        expect(
            isValidLoyaltyCampaignDates(startsAt, endsAt, endsAt),
        ).toBe(true);
        expect(
            isValidLoyaltyCampaignDates(
                startsAt,
                endsAt,
                new Date("bad"),
            ),
        ).toBe(false);
    });

    test("validates positive Decimal targets and COUNT integer targets", () => {
        expect(isValidPositiveDecimalString("10")).toBe(true);
        expect(isValidPositiveDecimalString("10.50")).toBe(true);
        expect(isValidPositiveDecimalString("0")).toBe(false);
        expect(isValidPositiveDecimalString("10.123")).toBe(false);
        expect(
            isValidLoyaltyCampaignTarget(
                LoyaltyCampaignMetric.COUNT,
                "10.00",
            ),
        ).toBe(true);
        expect(
            isValidLoyaltyCampaignTarget(
                LoyaltyCampaignMetric.COUNT,
                "10.50",
            ),
        ).toBe(false);
        expect(
            isValidLoyaltyCampaignTarget(
                LoyaltyCampaignMetric.SPEND,
                "10.50",
            ),
        ).toBe(true);
    });

    test("validates optional positive maxClaims and reward validity", () => {
        expect(isValidLoyaltyCampaignMaxClaims(1)).toBe(true);
        expect(isValidLoyaltyCampaignMaxClaims(0)).toBe(false);
        expect(isValidLoyaltyCampaignMaxClaims(1.5)).toBe(false);
        expect(isValidLoyaltyCampaignMaxClaims(null)).toBe(false);
        expect(
            isValidLoyaltyCampaignMaxClaims(MAX_LOYALTY_PRISMA_INT),
        ).toBe(true);
        expect(
            isValidLoyaltyCampaignMaxClaims(MAX_LOYALTY_PRISMA_INT + 1),
        ).toBe(false);
        expect(isValidLoyaltyRewardValidDays(30)).toBe(true);
        expect(
            isValidLoyaltyRewardValidDays(MAX_LOYALTY_PRISMA_INT),
        ).toBe(true);
        expect(
            isValidLoyaltyRewardValidDays(MAX_LOYALTY_PRISMA_INT + 1),
        ).toBe(false);
        expect(isValidLoyaltyRewardValidDays(0)).toBe(false);
        expect(isValidLoyaltyRewardValidDays(30.5)).toBe(false);
    });

    test("exposes the linear lifecycle and effective ended phase", () => {
        expect(
            canTransitionLoyaltyCampaignStatus(
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ACTIVE,
            ),
        ).toBe(true);
        expect(
            canTransitionLoyaltyCampaignStatus(
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ENDED,
            ),
        ).toBe(false);
        expect(
            getEffectiveLoyaltyCampaignStatus(
                LoyaltyCampaignStatus.ACTIVE,
                startsAt,
                endsAt,
                new Date("2030-01-11T00:00:00.000Z"),
            ),
        ).toBe(LoyaltyCampaignStatus.ENDED);
        expect(
            getEffectiveLoyaltyCampaignStatus(
                LoyaltyCampaignStatus.ACTIVE,
                startsAt,
                endsAt,
                new Date("2030-01-05T00:00:00.000Z"),
            ),
        ).toBe(LoyaltyCampaignStatus.ACTIVE);
    });

    test("allows claims only for active or ended campaigns before claimUntil", () => {
        const beforeDeadline = new Date("2030-01-31T23:59:59.000Z");
        expect(
            isLoyaltyCampaignClaimable(
                LoyaltyCampaignStatus.ACTIVE,
                startsAt,
                claimUntil,
                beforeDeadline,
            ),
        ).toBe(true);
        expect(
            isLoyaltyCampaignClaimable(
                LoyaltyCampaignStatus.ENDED,
                startsAt,
                claimUntil,
                beforeDeadline,
            ),
        ).toBe(true);
        expect(
            isLoyaltyCampaignClaimable(
                LoyaltyCampaignStatus.DRAFT,
                startsAt,
                claimUntil,
                beforeDeadline,
            ),
        ).toBe(false);
        expect(
            isLoyaltyCampaignClaimable(
                LoyaltyCampaignStatus.ENDED,
                startsAt,
                claimUntil,
                claimUntil,
            ),
        ).toBe(false);
    });

    test.each([
        [LoyaltyCampaignMetric.COUNT, "4.00", "4.00"],
        [LoyaltyCampaignMetric.SPEND, "19.9", "19.90"],
        [LoyaltyCampaignMetric.SPEND, "-1.00", "0.00"],
    ])("maps %s net Decimal progress to a fixed string", (
        metric,
        netTotal,
        expected,
    ) => {
        expect(getLoyaltyCampaignProgressValue(metric, netTotal)).toBe(
            expected,
        );
    });

    test("normalizes source contributions independently from aggregates", () => {
        expect(
            getLoyaltyCampaignContributionValue({
                metric: LoyaltyCampaignMetric.COUNT,
                netTotal: "99.99",
            }),
        ).toBe("1.00");
        expect(
            getLoyaltyCampaignContributionValue({
                metric: LoyaltyCampaignMetric.SPEND,
                netTotal: "19.9",
            }),
        ).toBe("19.90");
        expect(
            getLoyaltyCampaignContributionValue({
                metric: LoyaltyCampaignMetric.SPEND,
                netTotal: "-2.50",
            }),
        ).toBe("0.00");
    });

    test("maps generic source types to their specific campaign source", () => {
        expect(
            getLoyaltyCampaignSource(LoyaltySourceType.APPOINTMENT),
        ).toBe(LoyaltyCampaignSource.BOOKING);
        expect(getLoyaltyCampaignSource(LoyaltySourceType.ORDER)).toBe(
            LoyaltyCampaignSource.STORE,
        );
    });

    test("matches campaign sources to tenant types", () => {
        expect(
            isLoyaltyCampaignSourceCompatible(
                TenantType.STORE,
                LoyaltyCampaignSource.STORE,
            ),
        ).toBe(true);
        expect(
            isLoyaltyCampaignSourceCompatible(
                TenantType.BOOKING,
                LoyaltyCampaignSource.BOOKING,
            ),
        ).toBe(true);
        for (const source of [
            LoyaltyCampaignSource.BOOKING,
            LoyaltyCampaignSource.STORE,
            LoyaltyCampaignSource.ALL,
        ]) {
            expect(
                isLoyaltyCampaignSourceCompatible(TenantType.HYBRID, source),
            ).toBe(true);
        }
        expect(
            isLoyaltyCampaignSourceCompatible(
                TenantType.STORE,
                LoyaltyCampaignSource.BOOKING,
            ),
        ).toBe(false);
        expect(
            isLoyaltyCampaignSourceCompatible(
                TenantType.BOOKING,
                LoyaltyCampaignSource.ALL,
            ),
        ).toBe(false);
    });

    test("rejects fractional COUNT progress", () => {
        expect(() =>
            getLoyaltyCampaignProgressValue(
                LoyaltyCampaignMetric.COUNT,
                "4.50",
            ),
        ).toThrow(TypeError);
    });
});
