// Pure coupon math: financial risk, cheap tests
import {
    CouponType,
    calculateDiscount,
    hasReachedUsageLimit,
    isApplicableToCategory,
    isApplicableToProduct,
    isExpired,
} from "@/core/entities/coupon.entity";

function coupon(overrides: Partial<Parameters<typeof calculateDiscount>[0]> = {}) {
    return {
        id: "c1",
        code: "TEST",
        type: CouponType.PERCENT,
        value: 10,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01"),
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

describe("calculateDiscount", () => {
    test("percent discount", () => {
        expect(calculateDiscount(coupon({ type: CouponType.PERCENT, value: 10 }), 100)).toBe(10);
    });

    test("fixed discount", () => {
        expect(calculateDiscount(coupon({ type: CouponType.FIXED, value: 15 }), 100)).toBe(15);
    });

    test("zero below minPurchaseAmount", () => {
        expect(
            calculateDiscount(coupon({ minPurchaseAmount: 200 }), 100),
        ).toBe(0);
    });

    test("capped by maxDiscountAmount", () => {
        expect(
            calculateDiscount(coupon({ type: CouponType.PERCENT, value: 50, maxDiscountAmount: 20 }), 100),
        ).toBe(20);
    });
});

describe("isExpired / hasReachedUsageLimit", () => {
    test("expired when past expiresAt", () => {
        expect(isExpired(coupon({ expiresAt: new Date("2000-01-01") }))).toBe(true);
        expect(isExpired(coupon())).toBe(false);
    });

    test("no limit means never reached", () => {
        expect(hasReachedUsageLimit(coupon({ usageLimit: undefined }))).toBe(false);
    });

    test("reached at usageCount >= usageLimit", () => {
        expect(hasReachedUsageLimit(coupon({ usageLimit: 5, usageCount: 5 }))).toBe(true);
        expect(hasReachedUsageLimit(coupon({ usageLimit: 5, usageCount: 4 }))).toBe(false);
    });
});

describe("applicability", () => {
    test("empty list means applicable to all", () => {
        expect(isApplicableToProduct(coupon(), "any-product")).toBe(true);
        expect(isApplicableToCategory(coupon(), "any-category")).toBe(true);
    });

    test("restricts to listed ids", () => {
        const c = coupon({ applicableProducts: ["p1"], applicableCategories: ["cat1"] });
        expect(isApplicableToProduct(c, "p1")).toBe(true);
        expect(isApplicableToProduct(c, "p2")).toBe(false);
        expect(isApplicableToCategory(c, "cat2")).toBe(false);
    });
});
