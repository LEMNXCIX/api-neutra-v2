import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { CouponType, type Coupon } from "@/core/entities/coupon.entity";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
    return {
        id: "coupon-1",
        code: "REWARD-1",
        type: CouponType.PERCENT,
        value: 10,
        description: null,
        ownerId: null,
        sourceCouponId: null,
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usageCount: 0,
        active: true,
        isLoyaltyTemplate: false,
        expiresAt: new Date("2999-01-01"),
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    };
}

function setup(value: Coupon) {
    const repository = {
        findByCode: jest.fn().mockResolvedValue(value),
    };
    return {
        repository,
        useCase: new ValidateCouponUseCase(repository as never),
    };
}

describe("ValidateCouponUseCase loyalty ownership", () => {
    test("keeps shared coupons usable without a user context", async () => {
        const { useCase, repository } = setup(coupon({ isReward: false }));

        const result = await useCase.execute("tenant-1", {
            code: "SHARED",
            orderTotal: 100,
        });

        expect(result.success).toBe(true);
        expect(repository.findByCode).toHaveBeenCalledWith(
            "tenant-1",
            "SHARED",
            undefined,
        );
    });

    test("allows a personal reward clone for booking services", async () => {
        const { useCase } = setup(
            coupon({ ownerId: "user-1", isReward: true }),
        );

        const result = await useCase.execute(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                serviceIds: ["service-1"],
            },
            "user-1",
        );

        expect(result.success).toBe(true);
    });

    test("allows the same reward clone for an applicable store product", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableProducts: ["product-1"],
            }),
        );

        const result = await useCase.execute(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                productIds: ["product-1"],
                categoryIds: ["category-1"],
            },
            "user-1",
        );

        expect(result.success).toBe(true);
    });

    test("rejects a product-targeted coupon when only a service is supplied", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableProducts: ["product-1"],
                applicableServices: [],
            }),
        );

        await expect(
            useCase.execute(
                "tenant-1",
                {
                    code: "REWARD-1",
                    orderTotal: 100,
                    serviceIds: ["service-1"],
                },
                "user-1",
            ),
        ).rejects.toThrow("Coupon is only applicable to products");
    });

    test("rejects a category-targeted coupon when only a service is supplied", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableCategories: ["category-1"],
                applicableServices: [],
            }),
        );

        await expect(
            useCase.execute(
                "tenant-1",
                {
                    code: "REWARD-1",
                    orderTotal: 100,
                    serviceIds: ["service-1"],
                },
                "user-1",
            ),
        ).rejects.toThrow("Coupon is only applicable to products");
    });

    test("preserves a hybrid coupon when both product and service contexts match", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableProducts: ["product-1"],
                applicableServices: ["service-1"],
            }),
        );

        const result = await useCase.execute(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                productIds: ["product-1"],
                serviceIds: ["service-1"],
            },
            "user-1",
        );

        expect(result.success).toBe(true);
    });

    test("preserves a hybrid coupon for a matching product without service context", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableProducts: ["product-1"],
                applicableServices: ["service-1"],
            }),
        );

        const result = await useCase.execute(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                productIds: ["product-1"],
            },
            "user-1",
        );

        expect(result.success).toBe(true);
    });

    test("preserves a hybrid coupon for a matching service without product context", async () => {
        const { useCase } = setup(
            coupon({
                ownerId: "user-1",
                isReward: true,
                applicableProducts: ["product-1"],
                applicableServices: ["service-1"],
            }),
        );

        const result = await useCase.execute(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                serviceIds: ["service-1"],
            },
            "user-1",
        );

        expect(result.success).toBe(true);
    });

    test("rejects a reward coupon for another user", async () => {
        const { useCase } = setup(
            coupon({ ownerId: "user-1", isReward: true }),
        );

        await expect(
            useCase.execute(
                "tenant-1",
                {
                    code: "REWARD-1",
                    orderTotal: 100,
                    serviceIds: ["service-1"],
                },
                "user-2",
            ),
        ).rejects.toBeInstanceOf(BusinessRuleViolationError);
    });

    test("rejects a loyalty template while keeping clones redeemable", async () => {
        const { useCase } = setup(
            coupon({ isLoyaltyTemplate: true, applicableServices: [] }),
        );

        await expect(
            useCase.execute("tenant-1", {
                code: "REWARD-1",
                orderTotal: 100,
            }),
        ).rejects.toMatchObject({
            code: "LOYALTY_TEMPLATE_NOT_REDEEMABLE",
        });
    });

    test("rejects an expired coupon", async () => {
        const { useCase } = setup(
            coupon({ expiresAt: new Date("2000-01-01") }),
        );

        await expect(
            useCase.execute("tenant-1", {
                code: "REWARD-1",
                orderTotal: 100,
            }),
        ).rejects.toThrow("Coupon has expired");
    });

    test("rejects a coupon at its usage limit", async () => {
        const { useCase } = setup(coupon({ usageLimit: 1, usageCount: 1 }));

        await expect(
            useCase.execute("tenant-1", {
                code: "REWARD-1",
                orderTotal: 100,
            }),
        ).rejects.toThrow("Coupon usage limit reached");
    });
});
