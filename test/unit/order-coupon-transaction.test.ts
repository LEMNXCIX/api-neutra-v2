import { prisma } from "@/config/db.config";
import { PrismaOrderRepository } from "@/infrastructure/database/prisma/order.prisma-repository";

function couponRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "coupon-1",
        code: "REWARD-1",
        type: "PERCENT",
        value: 25,
        description: null,
        minPurchaseAmount: 50,
        maxDiscountAmount: 80,
        usageLimit: 1,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01"),
        tenantId: "tenant-1",
        ownerId: "customer-1",
        isReward: true,
        isLoyaltyTemplate: false,
        sourceCouponId: "template-1",
        applicableProducts: ["product-1"],
        applicableCategories: ["category-1"],
        applicableServices: ["service-1"],
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides,
    } as never;
}

function orderRow() {
    return {
        id: "order-1",
        userId: "customer-1",
        status: "PENDIENTE",
        trackingNumber: null,
        tenantId: "tenant-1",
        couponId: "coupon-1",
        subtotal: 100,
        total: 75,
        discountAmount: 25,
        items: [
            {
                id: "item-1",
                orderId: "order-1",
                productId: "product-1",
                amount: 2,
                price: 50,
                product: {
                    id: "product-1",
                    name: "Product 1",
                    description: "Product 1",
                    image: null,
                    price: 50,
                    stock: 3,
                    active: true,
                    ownerId: "owner-1",
                    tenantId: "tenant-1",
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            },
        ],
        user: { name: "Customer", email: "customer@test" },
        createdAt: new Date(),
        updatedAt: new Date(),
    } as never;
}

function orderData(overrides: Record<string, unknown> = {}) {
    return {
        userId: "customer-1",
        couponId: "coupon-1",
        items: [{ productId: "product-1", amount: 2, price: 50 }],
        ...overrides,
    } as never;
}

function mockCouponsFeature(enabled = true) {
    return jest
        .spyOn(prisma.tenantFeature, "findFirst")
        .mockResolvedValue(enabled ? ({ id: "feature-1" } as never) : null);
}

function passTransaction(couponsEnabled = true) {
    jest.spyOn(prisma, "$transaction").mockImplementation(
        async (callback: (tx: typeof prisma) => Promise<unknown>) =>
            callback(prisma),
    );
    mockCouponsFeature(couponsEnabled);
}

describe("Prisma order coupon transaction", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("revalidates, consumes by compare-and-set, and persists discounted totals", async () => {
        passTransaction();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
        jest.spyOn(prisma.product, "findMany").mockResolvedValue([
            { id: "product-1", categories: [{ id: "category-1" }] },
        ] as never);
        jest.spyOn(prisma.product, "updateMany").mockResolvedValue({
            count: 1,
        } as never);
        const usage = jest.spyOn(
            prisma.coupon,
            "updateMany",
        ) as unknown as jest.Mock;
        usage.mockResolvedValue({ count: 1 });
        const create = jest.spyOn(prisma.order, "create") as unknown as jest.Mock;
        create.mockResolvedValue(orderRow());

        const result = await new PrismaOrderRepository().createWithInventoryAdjustment(
            "tenant-1",
            orderData(),
            [{ productId: "product-1", amount: 2 }],
        );

        expect(result).toEqual(
            expect.objectContaining({
                subtotal: 100,
                discountAmount: 25,
                total: 75,
            }),
        );
        expect(usage).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "coupon-1",
                tenantId: "tenant-1",
                usageCount: 0,
                active: true,
                expiresAt: { gt: expect.any(Date) },
                isLoyaltyTemplate: false,
                ownerId: "customer-1",
                isReward: true,
            }),
            data: { usageCount: { increment: 1 } },
        });
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    couponId: "coupon-1",
                    subtotal: 100,
                    discountAmount: 25,
                    total: 75,
                }),
            }),
        );
    });

    test("rolls back when COUPONS is disabled before consumption", async () => {
        passTransaction(false);
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
        jest.spyOn(prisma.product, "findMany").mockResolvedValue([
            { id: "product-1", categories: [{ id: "category-1" }] },
        ] as never);
        const inventory = jest.spyOn(prisma.product, "updateMany");
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.order, "create");

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toMatchObject({ code: "COUPONS_FEATURE_REQUIRED" });
        expect(inventory).not.toHaveBeenCalled();
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("rejects a coupon reloaded for another owner before inventory changes", async () => {
        passTransaction();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow({ ownerId: "customer-2" }) as never,
        );
        const inventory = jest.spyOn(prisma.product, "updateMany");
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.order, "create");

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toMatchObject({ code: "COUPON_NOT_OWNED" });
        expect(inventory).not.toHaveBeenCalled();
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test.each([
        ["inactive", { active: false }, "Coupon is not active"],
        [
            "expired",
            { expiresAt: new Date("2000-01-01") },
            "Coupon has expired",
        ],
        [
            "at its limit",
            { usageLimit: 1, usageCount: 1 },
            "Coupon usage limit reached",
        ],
        [
            "a template",
            { isLoyaltyTemplate: true, ownerId: null, isReward: false },
            "Loyalty reward templates cannot be redeemed",
        ],
        [
            "an unassigned reward",
            { isReward: true, ownerId: null },
            "Reward coupon is not assigned to a customer",
        ],
    ])("rejects %s coupons before inventory changes", async (_, overrides, message) => {
        passTransaction();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow(overrides) as never,
        );
        const inventory = jest.spyOn(prisma.product, "updateMany");
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.order, "create");

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toThrow(message);
        expect(inventory).not.toHaveBeenCalled();
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("rejects a category mismatch before inventory changes", async () => {
        passTransaction();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
        jest.spyOn(prisma.product, "findMany").mockResolvedValue([
            { id: "product-1", categories: [{ id: "category-2" }] },
        ] as never);
        const inventory = jest.spyOn(prisma.product, "updateMany");
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.order, "create");

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toThrow("Coupon not applicable to product categories in cart");
        expect(inventory).not.toHaveBeenCalled();
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("rejects a subtotal below the coupon minimum before inventory changes", async () => {
        passTransaction();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow({ minPurchaseAmount: 101 }) as never,
        );
        jest.spyOn(prisma.product, "findMany").mockResolvedValue([
            { id: "product-1", categories: [{ id: "category-1" }] },
        ] as never);
        const inventory = jest.spyOn(prisma.product, "updateMany");
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.order, "create");

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toThrow("Minimum purchase amount of $101 required");
        expect(inventory).not.toHaveBeenCalled();
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("rolls back inventory and coupon usage when order creation fails", async () => {
        let stock = 5;
        let usageCount = 0;
        let orderCreated = false;
        const error = new Error("order write failed");
        mockCouponsFeature();
        jest.spyOn(prisma, "$transaction").mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) => {
                const initial = { stock, usageCount, orderCreated };
                try {
                    return await callback(prisma);
                } catch (caught) {
                    ({ stock, usageCount, orderCreated } = initial);
                    throw caught;
                }
            },
        );
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow({
                applicableProducts: [],
                applicableCategories: [],
                applicableServices: [],
            }) as never,
        );
        jest.spyOn(prisma.product, "findMany").mockResolvedValue([
            { id: "product-1", categories: [] },
        ] as never);
        (jest.spyOn(prisma.product, "updateMany") as unknown as jest.Mock).mockImplementation(
            async () => {
                stock -= 2;
                return { count: 1 };
            },
        );
        (
            jest.spyOn(prisma.coupon, "updateMany") as unknown as jest.Mock
        ).mockImplementation(async () => {
            usageCount += 1;
            return { count: 1 };
        });
        (jest.spyOn(prisma.order, "create") as unknown as jest.Mock).mockImplementation(
            async () => {
                orderCreated = true;
                throw error;
            },
        );

        await expect(
            new PrismaOrderRepository().createWithInventoryAdjustment(
                "tenant-1",
                orderData(),
                [{ productId: "product-1", amount: 2 }],
            ),
        ).rejects.toBe(error);
        expect(stock).toBe(5);
        expect(usageCount).toBe(0);
        expect(orderCreated).toBe(false);
    });
});
