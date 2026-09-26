jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Prisma } from "@prisma/client";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyLedgerEntryType,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";
import { PrismaCouponRepository } from "@/infrastructure/database/prisma/coupon.prisma-repository";
import {
    LoyaltyErrorCodes,
    ValidationErrorCodes,
} from "@/types/error-codes";

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
        count: jest.fn().mockResolvedValue(10),
        aggregate: jest.fn().mockResolvedValue({
            _sum: { value: new Prisma.Decimal("10.00") },
        }),
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
        create: jest.fn().mockImplementation(async ({ data }) =>
            campaignClaimRow(
                couponRow({
                    id: data.couponId,
                    ownerId: data.userId,
                    sourceCouponId: "template-1",
                }),
                data,
            ),
        ),
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
        expect(candidate.claimReward).toBeUndefined();
        expect(candidate.findRewardClaim).toBeUndefined();
        expect(candidate.getPointsBalance).toBeUndefined();
        expect(candidate.getTenantStats).toBeUndefined();
        expect(candidate.findActiveCampaignAt).toBeUndefined();
        expect(candidate.getCampaignStats).toBeUndefined();
    });

    test.each([
        [
            "infrastructure/database/prisma/loyalty.prisma-repository.ts",
            "findActiveCampaignAt",
        ],
        ["core/repositories/loyalty.repository.interface.ts", "findActiveCampaignAt"],
        [
            "infrastructure/database/prisma/loyalty.prisma-repository.ts",
            "getCampaignStats",
        ],
        ["core/repositories/loyalty.repository.interface.ts", "getCampaignStats"],
        ["core/entities/loyalty.entity.ts", "LoyaltyCampaignStats"],
        [
            "infrastructure/database/prisma/coupon.prisma-repository.ts",
            "cloneRewardCoupon",
        ],
        ["core/repositories/coupon.repository.interface.ts", "cloneRewardCoupon"],
    ])("keeps the dead %s out of the repository sources", (file, member) => {
        expect(readFileSync(join(__dirname, "..", "..", file), "utf8")).not.toContain(
            member,
        );
    });

    test("keeps the unguarded reward-minting path out of the coupon surface", () => {
        const { repository } = setup();
        const coupon = new PrismaCouponRepository() as unknown as Record<
            string,
            unknown
        >;
        expect(coupon.cloneRewardCoupon).toBeUndefined();
        expect(repository.claimCampaignReward).toBeDefined();
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
        ).rejects.toMatchObject({ code: ValidationErrorCodes.INVALID_CAMPAIGN_MAX_CLAIMS });
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
        [
            LoyaltyCampaignSource.BOOKING,
            [LoyaltySourceType.APPOINTMENT],
            "1.00",
        ],
        [LoyaltyCampaignSource.STORE, [LoyaltySourceType.ORDER], "2.00"],
        [
            LoyaltyCampaignSource.ALL,
            [LoyaltySourceType.APPOINTMENT, LoyaltySourceType.ORDER],
            "3.00",
        ],
    ])(
        "counts only compatible source rows for %s progress",
        async (source, sourceTypes, progressValue) => {
            const { repository, campaigns, ledger } = setup();
            campaigns.findFirst.mockResolvedValue(
                campaignRow({ source }),
            );
            ledger.count.mockImplementation(async ({ where }) => {
                if (where.entryType === LoyaltyLedgerEntryType.REVERSAL) {
                    return 0;
                }
                return where.sourceType.in.reduce(
                    (count: number, sourceType: LoyaltySourceType) =>
                        count +
                        (sourceType === LoyaltySourceType.APPOINTMENT ? 1 : 2),
                    0,
                );
            });

            await expect(
                repository.getCampaignProgress(
                    "tenant-1",
                    "campaign-1",
                    "user-1",
                ),
            ).resolves.toMatchObject({ progressValue });
            expect(ledger.count).toHaveBeenCalledWith({
                where: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "user-1",
                    sourceType: { in: sourceTypes },
                    entryType: LoyaltyLedgerEntryType.ACCRUAL,
                },
            });
            expect(ledger.count).toHaveBeenCalledWith({
                where: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "user-1",
                    sourceType: { in: sourceTypes },
                    entryType: LoyaltyLedgerEntryType.REVERSAL,
                },
            });
        },
    );

    test.each([
        [3, 1, "2.00", true],
        [1, 2, "0.00", false],
    ])(
        "derives COUNT progress from %i accruals and %i reversals without trusting values",
        async (accrualCount, reversalCount, progressValue, reachedTarget) => {
            const { repository, campaigns, ledger } = setup();
            campaigns.findFirst.mockResolvedValue(
                campaignRow({ targetValue: new Prisma.Decimal("2.00") }),
            );
            ledger.count.mockImplementation(async ({ where }) =>
                where.entryType === LoyaltyLedgerEntryType.ACCRUAL
                    ? accrualCount
                    : reversalCount,
            );
            ledger.aggregate.mockResolvedValue({
                _sum: { value: new Prisma.Decimal("999999.00") },
            });

            await expect(
                repository.getCampaignProgress(
                    "tenant-1",
                    "campaign-1",
                    "user-1",
                ),
            ).resolves.toMatchObject({ progressValue, reachedTarget });
            expect(ledger.aggregate).not.toHaveBeenCalled();
        },
    );

    test.each([
        ["19.95", "19.95"],
        ["-0.01", "0.00"],
    ])(
        "sums compatible SPEND Decimal values from %s and clamps progress",
        async (netTotal, progressValue) => {
            const { repository, campaigns, ledger } = setup();
            campaigns.findFirst.mockResolvedValue(
                campaignRow({
                    source: LoyaltyCampaignSource.ALL,
                    metric: LoyaltyCampaignMetric.SPEND,
                    targetValue: new Prisma.Decimal("20.00"),
                }),
            );
            ledger.aggregate.mockResolvedValue({
                _sum: { value: new Prisma.Decimal(netTotal) },
            });

            await expect(
                repository.getCampaignProgress(
                    "tenant-1",
                    "campaign-1",
                    "user-1",
                ),
            ).resolves.toMatchObject({
                metric: LoyaltyCampaignMetric.SPEND,
                progressValue,
                targetValue: "20.00",
                reachedTarget: false,
            });
            expect(ledger.count).not.toHaveBeenCalled();
            expect(ledger.aggregate).toHaveBeenCalledWith({
                where: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "user-1",
                    sourceType: {
                        in: [
                            LoyaltySourceType.APPOINTMENT,
                            LoyaltySourceType.ORDER,
                        ],
                    },
                    entryType: {
                        in: [
                            LoyaltyLedgerEntryType.ACCRUAL,
                            LoyaltyLedgerEntryType.REVERSAL,
                        ],
                    },
                },
                _sum: { value: true },
            });
        },
    );

    test("rejects lifecycle skips", async () => {
        const { repository, campaigns } = setup();
        campaigns.findFirst.mockResolvedValue(
            campaignRow({ maxClaims: 3, claimedCount: 1 }),
        );

        await expect(
            repository.transitionCampaignStatus(
                "tenant-1",
                "campaign-1",
                LoyaltyCampaignStatus.DRAFT,
                LoyaltyCampaignStatus.ARCHIVED,
            ),
        ).rejects.toMatchObject({
            code: LoyaltyErrorCodes.INVALID_CAMPAIGN_TRANSITION,
        });
    });

    test("keeps a migrated generic claim visible through its campaign", async () => {
        const { repository, claims } = setup();
        claims.findFirst.mockResolvedValue(
            campaignClaimRow(couponRow(), {
                id: "migrated-claim",
                campaignId: "migrated-campaign",
            }),
        );

        await expect(
            repository.findCampaignRewardClaim(
                "tenant-1",
                "migrated-campaign",
                "user-1",
            ),
        ).resolves.toMatchObject({
            id: "migrated-claim",
            campaignId: "migrated-campaign",
        });
        expect(claims.findFirst).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                campaignId: "migrated-campaign",
                userId: "user-1",
            },
            include: { coupon: true },
        });
    });
});
