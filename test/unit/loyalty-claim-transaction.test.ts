jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { Prisma } from "@prisma/client";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyLedgerEntryType,
    LoyaltySourceType,
} from "@/core/entities/loyalty.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";

const now = new Date("2030-01-01T00:00:00.000Z");
const startsAt = new Date("2029-12-01T00:00:00.000Z");
const endsAt = new Date("2030-01-10T00:00:00.000Z");
const claimUntil = new Date("2030-02-01T00:00:00.000Z");

function template(overrides: Record<string, unknown> = {}) {
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
        isLoyaltyTemplate: true,
        sourceCouponId: null,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function campaignRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "campaign-1",
        tenantId: "tenant-1",
        name: "January rewards",
        description: null,
        source: LoyaltyCampaignSource.BOOKING,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: new Prisma.Decimal("10.00"),
        status: LoyaltyCampaignStatus.ACTIVE,
        startsAt,
        endsAt,
        claimUntil,
        rewardCouponId: "template-1",
        rewardValidDays: 30,
        maxClaims: null,
        claimedCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    };
}

function campaignClaimRow(
    coupon = {
        ...template(),
        id: "coupon-1",
        ownerId: "customer-1",
        isReward: true,
        isLoyaltyTemplate: false,
        sourceCouponId: "template-1",
    },
    overrides: Record<string, unknown> = {},
) {
    return {
        id: "campaign-claim-1",
        tenantId: "tenant-1",
        campaignId: "campaign-1",
        userId: "customer-1",
        couponId: coupon.id,
        status: "CLAIMED",
        createdAt: now,
        updatedAt: now,
        coupon,
        ...overrides,
    };
}

function setup(
    campaignOverrides: Record<string, unknown> = {},
    netTotal = "10.00",
) {
    const ledger = {
        count: jest
            .fn()
            .mockImplementation(
                async ({
                    where,
                }: {
                    where: { entryType: LoyaltyLedgerEntryType };
                }) =>
                    where.entryType === LoyaltyLedgerEntryType.REVERSAL
                        ? 0
                        : 10,
            ),
        aggregate: jest.fn().mockResolvedValue({
            _sum: { value: new Prisma.Decimal(netTotal) },
        }),
    };
    const campaigns = {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(campaignRow(campaignOverrides)),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    };
    const claims = {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) =>
            campaignClaimRow(
                {
                    ...template(),
                    id: data.couponId,
                    ownerId: data.userId,
                    isReward: true,
                    isLoyaltyTemplate: false,
                    sourceCouponId: "template-1",
                },
                data,
            ),
        ),
    };
    const coupons = {
        findFirst: jest.fn().mockResolvedValue(template()),
        create: jest.fn().mockResolvedValue({
            ...template(),
            id: "coupon-1",
            ownerId: "customer-1",
            isReward: true,
            isLoyaltyTemplate: false,
        }),
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

describe("loyalty claim transaction", () => {
    beforeEach(() => {
        jest.useFakeTimers();
        jest.setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    test("claims source-aware campaign progress and reserves maxClaims in the same transaction", async () => {
        const { repository, campaigns, claims, coupons, ledger } = setup({
            maxClaims: 2,
        });
        ledger.count.mockImplementation(async ({ where }) =>
            where.entryType === LoyaltyLedgerEntryType.ACCRUAL &&
            where.sourceType.in.includes(LoyaltySourceType.APPOINTMENT)
                ? 10
                : 0,
        );

        const result = await repository.claimCampaignReward(
            "tenant-1",
            "campaign-1",
            "customer-1",
        );

        expect(ledger.count).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                campaignId: "campaign-1",
                userId: "customer-1",
                sourceType: { in: [LoyaltySourceType.APPOINTMENT] },
                entryType: LoyaltyLedgerEntryType.ACCRUAL,
            },
        });
        expect(ledger.count).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                campaignId: "campaign-1",
                userId: "customer-1",
                sourceType: { in: [LoyaltySourceType.APPOINTMENT] },
                entryType: LoyaltyLedgerEntryType.REVERSAL,
            },
        });
        expect(ledger.aggregate).not.toHaveBeenCalled();
        expect(campaigns.updateMany).toHaveBeenCalledWith({
            where: {
                id: "campaign-1",
                tenantId: "tenant-1",
                startsAt: { lte: now },
                claimUntil: { gt: now },
                status: { in: ["ACTIVE", "ENDED"] },
                claimedCount: { lt: 2 },
            },
            data: { claimedCount: { increment: 1 } },
        });
        expect(coupons.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    expiresAt: new Date("2030-01-31T00:00:00.000Z"),
                    ownerId: "customer-1",
                    usageLimit: 1,
                    isReward: true,
                    isLoyaltyTemplate: false,
                }),
            }),
        );
        expect(claims.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    campaignId: "campaign-1",
                    tenantId: "tenant-1",
                    userId: "customer-1",
                }),
            }),
        );
        expect(result.claim.campaignId).toBe("campaign-1");
    });

    test("requires startsAt <= now and accepts the exact boundary", async () => {
        const beforeStart = setup({
            startsAt: new Date(now.getTime() + 1),
        });
        await expect(
            beforeStart.repository.claimCampaignReward(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).rejects.toMatchObject({ code: "LOYALTY_CAMPAIGN_NOT_CLAIMABLE" });
        expect(beforeStart.campaigns.updateMany).not.toHaveBeenCalled();

        const atStart = setup({ startsAt: now });
        await expect(
            atStart.repository.claimCampaignReward(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).resolves.toMatchObject({
            claim: { campaignId: "campaign-1" },
        });
    });

    test("returns an existing campaign claim without reserving or cloning", async () => {
        const { repository, campaigns, claims, coupons } = setup();
        claims.findFirst.mockResolvedValue(campaignClaimRow());

        const result = await repository.claimCampaignReward(
            "tenant-1",
            "campaign-1",
            "customer-1",
        );

        expect(result.claim.id).toBe("campaign-claim-1");
        expect(campaigns.updateMany).not.toHaveBeenCalled();
        expect(coupons.create).not.toHaveBeenCalled();
    });

    test("rejects a campaign whose COUNT progress is below target", async () => {
        const { repository, campaigns, coupons, ledger } = setup();
        ledger.count.mockResolvedValueOnce(9).mockResolvedValueOnce(0);

        await expect(
            repository.claimCampaignReward(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).rejects.toMatchObject({ code: "LOYALTY_TARGET_NOT_REACHED" });
        expect(ledger.aggregate).not.toHaveBeenCalled();
        expect(campaigns.updateMany).not.toHaveBeenCalled();
        expect(coupons.create).not.toHaveBeenCalled();
    });

    test.each([
        ["draft", { status: LoyaltyCampaignStatus.DRAFT }],
        ["expired", { claimUntil: new Date("2029-12-31T00:00:00.000Z") }],
    ])(
        "rejects a %s campaign before reserving a claim",
        async (_label, overrides) => {
            const { repository, campaigns } = setup(overrides);

            await expect(
                repository.claimCampaignReward(
                    "tenant-1",
                    "campaign-1",
                    "customer-1",
                ),
            ).rejects.toMatchObject({ code: "LOYALTY_CAMPAIGN_NOT_CLAIMABLE" });
            expect(campaigns.updateMany).not.toHaveBeenCalled();
        },
    );

    test("requires a same-tenant shared loyalty template active through claimUntil", async () => {
        const { repository, campaigns, coupons } = setup();
        coupons.findFirst.mockResolvedValue(null);

        await expect(
            repository.claimCampaignReward(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_TEMPLATE" });
        expect(coupons.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "template-1",
                tenantId: "tenant-1",
                ownerId: null,
                isLoyaltyTemplate: true,
                expiresAt: { gte: claimUntil },
            }),
        });
        expect(campaigns.updateMany).not.toHaveBeenCalled();
    });

    test("does not create a coupon when the atomic maxClaims reservation is exhausted", async () => {
        const { repository, campaigns, claims, coupons } = setup({
            maxClaims: 1,
        });
        campaigns.updateMany.mockResolvedValue({ count: 0 });

        await expect(
            repository.claimCampaignReward(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).rejects.toMatchObject({
            code: "LOYALTY_CAMPAIGN_CLAIM_LIMIT_REACHED",
        });
        expect(coupons.create).not.toHaveBeenCalled();
        expect(claims.create).not.toHaveBeenCalled();
    });

    test("maps a P2002 campaign claim race to the existing claim", async () => {
        const { repository, claims, coupons } = setup();
        const existing = campaignClaimRow();
        claims.findFirst
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(existing);
        claims.create.mockRejectedValueOnce(
            new Prisma.PrismaClientKnownRequestError("duplicate", {
                code: "P2002",
                clientVersion: "test",
            }),
        );

        const result = await repository.claimCampaignReward(
            "tenant-1",
            "campaign-1",
            "customer-1",
        );

        expect(result.claim.id).toBe("campaign-claim-1");
        expect(coupons.create).toHaveBeenCalledTimes(1);
    });
});
