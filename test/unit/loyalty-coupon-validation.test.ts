import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { CouponType, type Coupon } from "@/core/entities/coupon.entity";

function coupon(overrides: Partial<Coupon> = {}): Coupon {
    return {
        id: "coupon-1",
        code: "REWARD-1",
        type: CouponType.PERCENT,
        value: 10,
        usageCount: 0,
        active: true,
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

    test("allows a reward coupon only for its owner", async () => {
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

    test("rejects a reward coupon for non-booking usage", async () => {
        const { useCase } = setup(
            coupon({ ownerId: "user-1", isReward: true }),
        );

        await expect(
            useCase.execute(
                "tenant-1",
                {
                    code: "REWARD-1",
                    orderTotal: 100,
                    productIds: ["product-1"],
                },
                "user-1",
            ),
        ).rejects.toMatchObject({ code: "REWARD_COUPON_SERVICES_ONLY" });
    });
});
