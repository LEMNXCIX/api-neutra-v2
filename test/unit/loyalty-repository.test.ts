jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { Prisma } from "@prisma/client";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";

const now = new Date("2030-01-01T00:00:00.000Z");

function couponRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "clone-1",
        tenantId: "tenant-1",
        code: "LOYALTY-CLONE",
        type: "PERCENT",
        value: 20,
        description: "Reward",
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: 1,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01"),
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
        ownerId: "user-1",
        isReward: true,
        sourceCouponId: "template-1",
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function claimRow(
    coupon = couponRow(),
    overrides: Record<string, unknown> = {},
) {
    return {
        id: "claim-1",
        tenantId: "tenant-1",
        userId: "user-1",
        milestone: 10,
        couponId: coupon.id,
        status: "CLAIMED",
        createdAt: now,
        updatedAt: now,
        coupon,
        ...overrides,
    };
}

function setup() {
    const ledger = {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockResolvedValue({
            id: "entry-1",
            tenantId: "tenant-1",
            userId: "user-1",
            sourceAppointmentId: "appointment-1",
            points: 1,
            reason: "appointment.completed",
            createdAt: now,
            updatedAt: now,
        }),
        aggregate: jest.fn().mockResolvedValue({ _sum: { points: 10 } }),
    };
    const claims = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (args) => ({
            ...claimRow(),
            ...args.data,
            coupon: couponRow(),
        })),
    };
    const coupons = {
        findFirst: jest.fn().mockResolvedValue(couponRow({ id: "template-1", ownerId: null, isReward: false, sourceCouponId: null })),
        create: jest.fn().mockResolvedValue(couponRow()),
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
        database,
    };
}

describe("PrismaLoyaltyRepository", () => {
    test("inserts a ledger entry idempotently by tenant and appointment", async () => {
        const { repository, ledger } = setup();

        const result = await repository.insertLedgerEntry("tenant-1", {
            userId: "user-1",
            sourceAppointmentId: "appointment-1",
            points: 1,
            reason: "appointment.completed",
        });

        expect(ledger.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    tenantId_sourceAppointmentId: {
                        tenantId: "tenant-1",
                        sourceAppointmentId: "appointment-1",
                    },
                },
                create: expect.objectContaining({
                    tenantId: "tenant-1",
                    points: 1,
                }),
                update: {},
            }),
        );
        expect(result.sourceAppointmentId).toBe("appointment-1");
    });

    test("sums points only within the requested tenant and user", async () => {
        const { repository, ledger } = setup();

        await expect(
            repository.getPointsBalance("tenant-1", "user-1"),
        ).resolves.toBe(10);
        expect(ledger.aggregate).toHaveBeenCalledWith({
            where: { tenantId: "tenant-1", userId: "user-1" },
            _sum: { points: true },
        });
    });

    test("claims once and clones the configured template in one transaction", async () => {
        const { repository, claims, coupons, database } = setup();

        const result = await repository.claimReward(
            "tenant-1",
            "user-1",
            "template-1",
        );

        expect(database.$transaction).toHaveBeenCalledTimes(1);
        expect(coupons.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    tenantId: "tenant-1",
                    ownerId: "user-1",
                    isReward: true,
                    sourceCouponId: "template-1",
                    usageLimit: 1,
                }),
            }),
        );
        expect(claims.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    tenantId: "tenant-1",
                    userId: "user-1",
                    milestone: 10,
                    couponId: "clone-1",
                    status: "CLAIMED",
                }),
            }),
        );
        expect(result.coupon.ownerId).toBe("user-1");
        expect(result.claim.milestone).toBe(10);
    });

    test("returns the existing claim without cloning another coupon", async () => {
        const { repository, claims, coupons } = setup();
        claims.findFirst.mockResolvedValue(claimRow());

        const result = await repository.claimReward(
            "tenant-1",
            "user-1",
            "template-1",
        );

        expect(result.claim.id).toBe("claim-1");
        expect(coupons.create).not.toHaveBeenCalled();
        expect(claims.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { tenantId: "tenant-1", userId: "user-1" },
            }),
        );
    });

    test("returns the original target when the configured target was lowered", async () => {
        const { repository, claims, coupons } = setup();
        claims.findFirst.mockResolvedValue(
            claimRow(couponRow(), { milestone: 15 }),
        );

        const result = await repository.claimReward(
            "tenant-1",
            "user-1",
            "template-1",
            10,
        );

        expect(result.claim.milestone).toBe(15);
        expect(coupons.create).not.toHaveBeenCalled();
    });

    test.each([
        ["inactive", { active: false }],
        ["expired", { expiresAt: new Date("2000-01-01T00:00:00.000Z") }],
    ])("rejects an %s template without creating a reward coupon", async (
        _label,
        overrides,
    ) => {
        const { repository, coupons } = setup();
        coupons.findFirst.mockResolvedValue(
            couponRow({
                id: "template-1",
                ownerId: null,
                isReward: false,
                sourceCouponId: null,
                ...overrides,
            }),
        );

        await expect(
            repository.claimReward(
                "tenant-1",
                "user-1",
                "template-1",
            ),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_TEMPLATE" });
        expect(coupons.create).not.toHaveBeenCalled();
    });

    test("rejects unsafe target points before opening a transaction", async () => {
        const { repository, database } = setup();

        await expect(
            repository.claimReward(
                "tenant-1",
                "user-1",
                "template-1",
                Number.MAX_SAFE_INTEGER + 1,
            ),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_TARGET_POINTS" });
        expect(database.$transaction).not.toHaveBeenCalled();
    });

    test("returns the winner after a concurrent unique-claim conflict", async () => {
        const { repository, claims, coupons } = setup();
        const existing = claimRow(couponRow(), { milestone: 15 });
        claims.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(existing);
        claims.create.mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError("duplicate", {
                code: "P2002",
                clientVersion: "test",
            }),
        );

        const result = await repository.claimReward(
            "tenant-1",
            "user-1",
            "template-1",
            10,
        );

        expect(result.claim.milestone).toBe(15);
        expect(coupons.create).toHaveBeenCalledTimes(1);
    });
});
