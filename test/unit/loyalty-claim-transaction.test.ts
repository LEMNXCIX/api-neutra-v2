jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";

const now = new Date("2030-01-01T00:00:00.000Z");

function template() {
    return {
        id: "template-1",
        tenantId: "tenant-1",
        code: "TEMPLATE",
        type: "PERCENT",
        value: 10,
        description: null,
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01T00:00:00.000Z"),
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
        ownerId: null,
        isReward: false,
        sourceCouponId: null,
        createdAt: now,
        updatedAt: now,
    };
}

function setup(balance = 10) {
    const ledger = {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        aggregate: jest.fn().mockResolvedValue({
            _sum: { points: balance },
        }),
    };
    const claims = {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async ({ data }) => ({
            id: "claim-1",
            tenantId: "tenant-1",
            userId: "customer-1",
            milestone: data.milestone,
            couponId: "coupon-1",
            status: data.status,
            createdAt: now,
            updatedAt: now,
            coupon: {
                ...template(),
                id: "coupon-1",
                ownerId: "customer-1",
                isReward: true,
                sourceCouponId: "template-1",
            },
        })),
    };
    const coupons = {
        findFirst: jest.fn().mockResolvedValue(template()),
        create: jest.fn().mockResolvedValue({
            ...template(),
            id: "coupon-1",
            ownerId: "customer-1",
            isReward: true,
            sourceCouponId: "template-1",
        }),
    };
    const tx = {
        loyaltyLedgerEntry: ledger,
        loyaltyRewardClaim: claims,
        coupon: coupons,
    };
    const database = {
        ...tx,
        $transaction: jest.fn(async (callback) => callback(tx)),
    };
    return {
        repository: new PrismaLoyaltyRepository(database as never),
        ledger,
        claims,
        coupons,
    };
}

describe("loyalty claim transaction", () => {
    test("checks the target balance inside the transaction before cloning", async () => {
        const { repository, ledger, coupons } = setup(9);

        await expect(
            repository.claimReward(
                "tenant-1",
                "customer-1",
                "template-1",
                10,
            ),
        ).rejects.toMatchObject({ code: "LOYALTY_TARGET_NOT_REACHED" });
        expect(ledger.aggregate).toHaveBeenCalledWith({
            where: { tenantId: "tenant-1", userId: "customer-1" },
            _sum: { points: true },
        });
        expect(coupons.create).not.toHaveBeenCalled();
    });

    test("uses the configured milestone in the balance check and claim", async () => {
        const { repository, ledger, claims } = setup(15);

        const result = await repository.claimReward(
            "tenant-1",
            "customer-1",
            "template-1",
            15,
        );

        expect(ledger.aggregate).toHaveBeenCalledWith({
            where: { tenantId: "tenant-1", userId: "customer-1" },
            _sum: { points: true },
        });
        expect(claims.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ milestone: 15 }),
            }),
        );
        expect(result.claim.milestone).toBe(15);
    });

    test("keeps overview statistics scoped to the requested tenant", async () => {
        const { repository, ledger, claims } = setup(20);
        ledger.findMany.mockResolvedValue([
            {
                id: "entry-1",
                tenantId: "tenant-1",
                userId: "customer-1",
                sourceAppointmentId: "appointment-1",
                points: 20,
                reason: "appointment.completed",
                createdAt: now,
                updatedAt: now,
            },
        ]);
        claims.count.mockResolvedValue(2);

        await expect(repository.getTenantStats("tenant-1")).resolves.toEqual({
            tenantId: "tenant-1",
            totalPoints: 20,
            totalClaims: 2,
            activeCustomers: 1,
        });
        expect(claims.count).toHaveBeenCalledWith({ where: { tenantId: "tenant-1" } });
        expect(ledger.findMany).toHaveBeenCalledWith({
            where: { tenantId: "tenant-1" },
            orderBy: { createdAt: "desc" },
        });
    });
});
