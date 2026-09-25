jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { Prisma } from "@prisma/client";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";

const now = new Date("2030-01-01T00:00:00.000Z");
const startsAt = new Date("2029-12-01T00:00:00.000Z");
const endsAt = new Date("2030-01-10T00:00:00.000Z");
const claimUntil = new Date("2030-02-01T00:00:00.000Z");

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
        isLoyaltyTemplate: false,
        sourceCouponId: "template-1",
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function rewardDefinition() {
    return {
        type: "PERCENT",
        value: 20,
        description: "Reward",
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
    } as never;
}

function claimRow(
    coupon = couponRow(),
    overrides: Record<string, unknown> = {},
) {
    return {
        id: "claim-1",
        tenantId: "tenant-1",
        campaignId: null,
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

function campaignRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "campaign-1",
        tenantId: "tenant-1",
        name: "January rewards",
        description: "Campaign description",
        source: "BOOKING",
        metric: "COUNT",
        targetValue: new Prisma.Decimal("10.00"),
        status: "ACTIVE",
        startsAt,
        endsAt,
        claimUntil,
        rewardCouponId: "template-1",
        rewardValidDays: 30,
        maxClaims: null,
        claimedCount: 0,
        createdAt: now,
        updatedAt: now,
        rewardCoupon: couponRow({
            id: "template-1",
            ownerId: null,
            isReward: false,
            isLoyaltyTemplate: true,
            sourceCouponId: null,
        }),
        ...overrides,
    };
}

function campaignClaimRow(
    coupon = couponRow(),
    overrides: Record<string, unknown> = {},
) {
    return {
        id: "campaign-claim-1",
        tenantId: "tenant-1",
        campaignId: "campaign-1",
        userId: "user-1",
        milestone: null,
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
        aggregate: jest.fn().mockImplementation(async ({ _sum }) => ({
            _sum: _sum.value
                ? { value: new Prisma.Decimal("10.00") }
                : { points: 10 },
        })),
    };
    const campaigns = {
        create: jest.fn().mockImplementation(async ({ data }) =>
            campaignRow({ ...data, id: "campaign-1" }),
        ),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const claims = {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async ({ data }) => {
            if (data.campaignId) {
                return campaignClaimRow(
                    couponRow({
                        id: data.couponId,
                        ownerId: data.userId,
                        sourceCouponId: "template-1",
                    }),
                    data,
                );
            }
            return claimRow(couponRow(), data);
        }),
    };
    const coupons = {
        findFirst: jest.fn().mockResolvedValue(
            couponRow({
                id: "template-1",
                ownerId: null,
                isReward: false,
                isLoyaltyTemplate: true,
                sourceCouponId: null,
            }),
        ),
        create: jest.fn().mockImplementation(async ({ data }) =>
            couponRow({
                id: data.isLoyaltyTemplate ? "template-1" : "clone-1",
                ownerId: data.ownerId,
                isReward: data.isReward,
                isLoyaltyTemplate: data.isLoyaltyTemplate,
                sourceCouponId: data.sourceCouponId,
            }),
        ),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const tx = {
        loyaltyLedgerEntry: ledger,
        loyaltyCampaign: campaigns,
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
        campaigns,
        claims,
        coupons,
        database,
    };
}

describe("PrismaLoyaltyRepository", () => {
    test("inserts a legacy ledger entry idempotently by tenant and appointment", async () => {
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

    test("sums legacy points only within the requested tenant and user", async () => {
        const { repository, ledger } = setup();

        await expect(
            repository.getPointsBalance("tenant-1", "user-1"),
        ).resolves.toBe(10);
        expect(ledger.aggregate).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                userId: "user-1",
                points: { not: null },
            },
            _sum: { points: true },
        });
    });

    test("creates a tenant-scoped campaign with a fixed Decimal string", async () => {
        const { repository, campaigns, coupons, database } = setup();

        const result = await repository.createCampaign("tenant-1", {
            name: "Spend rewards",
            source: LoyaltyCampaignSource.STORE,
            metric: LoyaltyCampaignMetric.SPEND,
            targetValue: "100.5",
            startsAt,
            endsAt,
            claimUntil,
            reward: rewardDefinition(),
            rewardValidDays: 30,
            maxClaims: 50,
        });

        const createData = campaigns.create.mock.calls[0][0].data;
        expect(createData.targetValue.toFixed(2)).toBe("100.50");
        expect(createData).toEqual(
            expect.objectContaining({
                tenantId: "tenant-1",
                status: LoyaltyCampaignStatus.DRAFT,
            }),
        );
        expect(database.$transaction).toHaveBeenCalledTimes(1);
        expect(coupons.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    ownerId: null,
                    active: true,
                    isReward: false,
                    isLoyaltyTemplate: true,
                    usageLimit: null,
                    expiresAt: claimUntil,
                }),
            }),
        );
        expect(result.targetValue).toBe("100.50");
    });

    test("round-trips the reward definition on campaign reads", async () => {
        const { repository, campaigns } = setup();
        campaigns.findFirst.mockResolvedValue(campaignRow());

        await expect(
            repository.getCampaign("tenant-1", "campaign-1"),
        ).resolves.toMatchObject({
            reward: expect.objectContaining({
                type: "PERCENT",
                value: 20,
                applicableServices: ["service-1"],
            }),
        });
    });

    test("extends claimUntil and the existing template expiry atomically", async () => {
        const { repository, campaigns, coupons } = setup();
        campaigns.findFirst
            .mockResolvedValueOnce(campaignRow({ status: "DRAFT" }))
            .mockResolvedValueOnce(
                campaignRow({ status: "DRAFT", claimUntil: new Date("2030-03-01") }),
            );
        coupons.findFirst.mockResolvedValue(
            couponRow({
                id: "template-1",
                ownerId: null,
                isReward: false,
                isLoyaltyTemplate: true,
                expiresAt: new Date("2000-01-01"),
            }),
        );

        await repository.updateCampaign("tenant-1", "campaign-1", {
            claimUntil: new Date("2030-03-01"),
        });

        expect(coupons.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: "template-1" }),
                data: { expiresAt: new Date("2030-03-01") },
            }),
        );
        expect(campaigns.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ claimUntil: new Date("2030-03-01") }),
            }),
        );
    });

    test("rolls back a claimUntil extension when the template is missing", async () => {
        const { repository, campaigns, coupons, database } = setup();
        campaigns.findFirst.mockResolvedValue(campaignRow({ status: "DRAFT" }));
        coupons.findFirst.mockResolvedValue(null);

        await expect(
            repository.updateCampaign("tenant-1", "campaign-1", {
                claimUntil: new Date("2030-03-01"),
            }),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_TEMPLATE" });
        expect(database.$transaction).toHaveBeenCalledTimes(1);
        expect(campaigns.updateMany).not.toHaveBeenCalled();
    });

    test("does not expose removed repository aliases", () => {
        const { repository } = setup();
        const candidate = repository as unknown as Record<string, unknown>;
        expect(candidate.createCampaignWithTemplate).toBeUndefined();
        expect(candidate.updateCampaignWithTemplate).toBeUndefined();
        expect(candidate.findCampaignClaim).toBeUndefined();
        expect(candidate.getCampaignClaim).toBeUndefined();
    });

    test("updates a campaign only inside its tenant", async () => {
        const { repository, campaigns, coupons } = setup();
        campaigns.findFirst
            .mockResolvedValueOnce(campaignRow({ status: "DRAFT" }))
            .mockResolvedValueOnce(
                campaignRow({ status: "DRAFT", targetValue: new Prisma.Decimal("20.00") }),
            );

        await repository.updateCampaign("tenant-1", "campaign-1", {
            targetValue: "20",
        });

        expect(coupons.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({ tenantId: "tenant-1" }),
        });
        expect(campaigns.updateMany).toHaveBeenCalledWith({
            where: {
                id: "campaign-1",
                tenantId: "tenant-1",
                status: LoyaltyCampaignStatus.DRAFT,
            },
            data: expect.objectContaining({ targetValue: expect.any(Prisma.Decimal) }),
        });
    });

    test("rejects update and delete for non-DRAFT campaigns", async () => {
        const update = setup();
        update.campaigns.findFirst.mockResolvedValue(
            campaignRow({ status: LoyaltyCampaignStatus.ACTIVE }),
        );
        await expect(
            update.repository.updateCampaign("tenant-1", "campaign-1", {
                name: "Changed",
            }),
        ).rejects.toMatchObject({ code: "LOYALTY_CAMPAIGN_NOT_DRAFT" });
        expect(update.campaigns.updateMany).not.toHaveBeenCalled();
        expect(update.coupons.findFirst).not.toHaveBeenCalled();

        const deletion = setup();
        deletion.campaigns.findFirst.mockResolvedValue(
            campaignRow({ status: LoyaltyCampaignStatus.ENDED }),
        );
        await expect(
            deletion.repository.deleteCampaign("tenant-1", "campaign-1"),
        ).rejects.toMatchObject({ code: "LOYALTY_CAMPAIGN_NOT_DRAFT" });
        expect(deletion.campaigns.deleteMany).not.toHaveBeenCalled();
    });

    test("uses DRAFT compare-and-set for update and delete", async () => {
        const update = setup();
        update.campaigns.findFirst
            .mockResolvedValueOnce(campaignRow({ status: LoyaltyCampaignStatus.DRAFT }))
            .mockResolvedValueOnce(
                campaignRow({
                    status: LoyaltyCampaignStatus.DRAFT,
                    name: "Changed",
                }),
            );
        await update.repository.updateCampaign("tenant-1", "campaign-1", {
            name: "Changed",
        });
        expect(update.campaigns.updateMany).toHaveBeenCalledWith({
            where: {
                id: "campaign-1",
                tenantId: "tenant-1",
                status: LoyaltyCampaignStatus.DRAFT,
            },
            data: expect.objectContaining({ name: "Changed" }),
        });

        const deletion = setup();
        deletion.campaigns.findFirst.mockResolvedValue(
            campaignRow({ status: LoyaltyCampaignStatus.DRAFT }),
        );
        await deletion.repository.deleteCampaign("tenant-1", "campaign-1");
        expect(deletion.campaigns.deleteMany).toHaveBeenCalledWith({
            where: {
                id: "campaign-1",
                tenantId: "tenant-1",
                status: LoyaltyCampaignStatus.DRAFT,
            },
        });
    });

    test("rejects maxClaims below the existing claimedCount", async () => {
        const { repository, campaigns, coupons } = setup();
        campaigns.findFirst.mockResolvedValue(
            campaignRow({
                status: LoyaltyCampaignStatus.DRAFT,
                maxClaims: 5,
                claimedCount: 3,
            }),
        );

        await expect(
            repository.updateCampaign("tenant-1", "campaign-1", {
                maxClaims: 2,
            }),
        ).rejects.toMatchObject({ code: "INVALID_CAMPAIGN_MAX_CLAIMS" });
        expect(coupons.findFirst).not.toHaveBeenCalled();
        expect(campaigns.updateMany).not.toHaveBeenCalled();
    });

    test("revalidates the full campaign and template on activation", async () => {
        const { repository, campaigns, coupons } = setup();
        campaigns.findFirst.mockResolvedValue(
            campaignRow({ status: LoyaltyCampaignStatus.DRAFT }),
        );
        coupons.findFirst.mockResolvedValue(null);

        await expect(
            repository.transitionCampaignStatus(
                "tenant-1",
                "campaign-1",
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ACTIVE,
            ),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_TEMPLATE" });
        expect(coupons.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "template-1",
                tenantId: "tenant-1",
                expiresAt: { gte: claimUntil },
            }),
        });
        expect(campaigns.updateMany).not.toHaveBeenCalled();
    });

    test("archives only at or after claimUntil", async () => {
        jest.useFakeTimers().setSystemTime(now);
        try {
            const early = setup();
            early.campaigns.findFirst.mockResolvedValue(
                campaignRow({ status: LoyaltyCampaignStatus.ENDED }),
            );
            await expect(
                early.repository.transitionCampaignStatus(
                    "tenant-1",
                    "campaign-1",
                    LoyaltyCampaignStatus.ENDED,
                    LoyaltyCampaignStatus.ARCHIVED,
                ),
            ).rejects.toMatchObject({
                code: "LOYALTY_CAMPAIGN_ARCHIVE_TOO_EARLY",
            });
            expect(early.campaigns.updateMany).not.toHaveBeenCalled();

            const due = setup();
            due.campaigns.findFirst
                .mockResolvedValueOnce(
                    campaignRow({
                        status: LoyaltyCampaignStatus.ENDED,
                        claimUntil: now,
                    }),
                )
                .mockResolvedValueOnce(
                    campaignRow({
                        status: LoyaltyCampaignStatus.ARCHIVED,
                        claimUntil: now,
                    }),
                );
            await expect(
                due.repository.transitionCampaignStatus(
                    "tenant-1",
                    "campaign-1",
                    LoyaltyCampaignStatus.ENDED,
                    LoyaltyCampaignStatus.ARCHIVED,
                ),
            ).resolves.toMatchObject({ status: LoyaltyCampaignStatus.ARCHIVED });
            expect(due.campaigns.updateMany).toHaveBeenCalledWith({
                where: {
                    id: "campaign-1",
                    tenantId: "tenant-1",
                    status: LoyaltyCampaignStatus.ENDED,
                },
                data: { status: LoyaltyCampaignStatus.ARCHIVED },
            });
        } finally {
            jest.useRealTimers();
        }
    });

    test.each([
        [LoyaltySourceType.APPOINTMENT, LoyaltyCampaignSource.BOOKING],
        [LoyaltySourceType.ORDER, LoyaltyCampaignSource.STORE],
    ])(
        "finds the tenant's active %s campaign at the requested instant",
        async (sourceType, expectedSource) => {
            const { repository, campaigns } = setup();
            campaigns.findFirst.mockResolvedValue(campaignRow());
            const at = new Date("2030-01-01T00:00:00.000Z");

            await expect(
                repository.findActiveCampaignAt("tenant-1", sourceType, at),
            ).resolves.toMatchObject({ id: "campaign-1", targetValue: "10.00" });
            expect(campaigns.findFirst).toHaveBeenCalledWith({
                include: { rewardCoupon: true },
                where: {
                    tenantId: "tenant-1",
                    status: LoyaltyCampaignStatus.ACTIVE,
                    source: {
                        in: [expectedSource, LoyaltyCampaignSource.ALL],
                    },
                    startsAt: { lte: at },
                    endsAt: { gt: at },
                },
                orderBy: { startsAt: "desc" },
            });
        },
    );

    test.each([
        [LoyaltyCampaignMetric.COUNT, "10.00", "10.00", true],
        [LoyaltyCampaignMetric.SPEND, "19.95", "19.90", false],
    ])(
        "maps Decimal %s campaign progress without floating point",
        async (metric, targetValue, progressValue, reachedTarget) => {
            const { repository, campaigns, ledger } = setup();
            campaigns.findFirst.mockResolvedValue(
                campaignRow({
                    metric,
                    targetValue: new Prisma.Decimal(targetValue),
                }),
            );
            ledger.aggregate.mockResolvedValue({
                _sum: { value: new Prisma.Decimal(progressValue) },
            });

            await expect(
                repository.getCampaignProgress(
                    "tenant-1",
                    "campaign-1",
                    "user-1",
                ),
            ).resolves.toEqual({
                campaignId: "campaign-1",
                userId: "user-1",
                metric,
                progressValue,
                targetValue,
                reachedTarget,
            });
            expect(ledger.aggregate).toHaveBeenCalledWith({
                where: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "user-1",
                },
                _sum: { value: true },
            });
        },
    );

    test("returns campaign stats and rejects lifecycle skips", async () => {
        const { repository, campaigns, claims } = setup();
        campaigns.findFirst.mockResolvedValue(
            campaignRow({ maxClaims: 3, claimedCount: 1 }),
        );
        claims.count.mockResolvedValue(99);

        await expect(
            repository.getCampaignStats("tenant-1", "campaign-1"),
        ).resolves.toEqual({
            campaignId: "campaign-1",
            claimedCount: 1,
            maxClaims: 3,
            remainingClaims: 2,
        });
        expect(claims.count).not.toHaveBeenCalled();
        await expect(
            repository.transitionCampaignStatus(
                "tenant-1",
                "campaign-1",
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ARCHIVED,
            ),
        ).rejects.toMatchObject({
            code: "INVALID_LOYALTY_CAMPAIGN_TRANSITION",
        });
    });

    test("claims once and clones the configured template in one legacy transaction", async () => {
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
                    isLoyaltyTemplate: false,
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

    test("returns the existing legacy claim without cloning another coupon", async () => {
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
                where: {
                    tenantId: "tenant-1",
                    userId: "user-1",
                    milestone: { not: null },
                },
            }),
        );
    });

    test("keeps a T1-backfilled legacy claim visible to legacy callers", async () => {
        const { repository, claims } = setup();
        claims.findFirst.mockResolvedValue(
            claimRow(couponRow(), { campaignId: "legacy-campaign" }),
        );

        await expect(
            repository.findRewardClaim("tenant-1", "user-1"),
        ).resolves.toMatchObject({ id: "claim-1", milestone: 10 });
        expect(claims.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    tenantId: "tenant-1",
                    userId: "user-1",
                    milestone: { not: null },
                },
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
    ])("rejects an %s legacy template without creating a reward coupon", async (
        _label,
        overrides,
    ) => {
        const { repository, coupons } = setup();
        coupons.findFirst.mockResolvedValue(
            couponRow({
                id: "template-1",
                ownerId: null,
                isReward: false,
                isLoyaltyTemplate: true,
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

    test("returns the winner after a concurrent legacy unique-claim conflict", async () => {
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
