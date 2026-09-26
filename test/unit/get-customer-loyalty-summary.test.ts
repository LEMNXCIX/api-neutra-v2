jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { Prisma } from "@prisma/client";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyStatus,
} from "@/core/entities/loyalty.entity";
import { TenantType } from "@/core/entities/tenant.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";

const now = new Date("2030-01-15T00:00:00.000Z");
const startsAt = new Date("2030-01-01T00:00:00.000Z");
const endsAt = new Date("2030-01-31T00:00:00.000Z");
const claimUntil = new Date("2030-02-10T00:00:00.000Z");

function campaignRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "campaign-1",
        tenantId: "tenant-1",
        name: "January rewards",
        description: null,
        source: LoyaltyCampaignSource.STORE,
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
        rewardCoupon: null,
        ...overrides,
    };
}

/**
 * A loyalty database that records every query it is asked, so a regression to
 * the per-campaign fan-out shows up as a longer query list.
 */
function countingDatabase(rows: ReturnType<typeof campaignRow>[]) {
    const queries: string[] = [];
    const record =
        (label: string, value: unknown) =>
        async () => {
            queries.push(label);
            return value;
        };
    const ledgerCount = async (args: {
        where: { campaignId: string; entryType: string };
    }) => {
        queries.push(`ledger.count:${args.where.campaignId}`);
        return args.where.entryType === "ACCRUAL" ? 3 : 1;
    };
    const ledgerAggregate = async (args: {
        where: { campaignId: string };
    }) => {
        queries.push(`ledger.aggregate:${args.where.campaignId}`);
        return { _sum: { value: new Prisma.Decimal("4.00") } };
    };
    const database = {
        loyaltyCampaign: {
            findMany: async () => {
                queries.push("campaign.findMany");
                return rows;
            },
            findFirst: async (args: { where: { id: string } }) => {
                queries.push(`campaign.findFirst:${args.where.id}`);
                return (
                    rows.find((row) => row.id === args.where.id) ?? null
                );
            },
        },
        loyaltyLedgerEntry: {
            count: ledgerCount,
            aggregate: ledgerAggregate,
        },
        loyaltyRewardClaim: {
            findFirst: record("claim.findFirst", null),
        },
        coupon: {
            findFirst: record("coupon.findFirst", null),
        },
    };
    return {
        database,
        queries,
    };
}

function useCaseFor(database: unknown) {
    return new GetCustomerLoyaltySummaryUseCase(
        new PrismaLoyaltyRepository(database as never),
        {
            findById: jest.fn().mockResolvedValue({
                id: "tenant-1",
                name: "Tenant One",
                slug: "tenant-one",
                type: TenantType.STORE,
                active: true,
                config: {},
            }),
        } as never,
        {
            getTenantFeatureStatus: jest.fn().mockResolvedValue({
                LOYALTY: true,
                COUPONS: true,
            }),
        } as never,
    );
}

describe("customer loyalty summary query count", () => {
    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(now);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    const countCampaigns = [
        campaignRow({ id: "count-1" }),
        campaignRow({ id: "count-2" }),
    ];
    const spendCampaigns = [
        campaignRow({
            id: "spend-1",
            metric: LoyaltyCampaignMetric.SPEND,
            targetValue: new Prisma.Decimal("50.00"),
        }),
        campaignRow({
            id: "spend-2",
            metric: LoyaltyCampaignMetric.SPEND,
            targetValue: new Prisma.Decimal("50.00"),
        }),
    ];

    test("reads each COUNT campaign once and only its ledger and claim", async () => {
        const { database, queries } = countingDatabase(countCampaigns);

        await expect(
            useCaseFor(database).executeList("tenant-1", "customer-1"),
        ).resolves.toMatchObject({ success: true });

        expect([...queries].sort()).toEqual(
            [
                "campaign.findMany",
                "ledger.count:count-1",
                "ledger.count:count-1",
                "ledger.count:count-2",
                "ledger.count:count-2",
                "claim.findFirst",
                "claim.findFirst",
            ].sort(),
        );
        expect(queries.filter((q) => q.startsWith("campaign.findFirst"))).toEqual(
            [],
        );
    });

    test("reads each SPEND campaign once and only its aggregate and claim", async () => {
        const { database, queries } = countingDatabase(spendCampaigns);

        await useCaseFor(database).executeList("tenant-1", "customer-1");

        expect([...queries].sort()).toEqual(
            [
                "campaign.findMany",
                "ledger.aggregate:spend-1",
                "ledger.aggregate:spend-2",
                "claim.findFirst",
                "claim.findFirst",
            ].sort(),
        );
    });

    test("returns the same COUNT summaries as the per-campaign reads did", async () => {
        const { database } = countingDatabase(countCampaigns);

        const result = await useCaseFor(database).executeList(
            "tenant-1",
            "customer-1",
        );

        expect(result.data).toEqual([
            expect.objectContaining({
                campaignId: "count-1",
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue: "2.00",
                targetValue: "10.00",
                remainingValue: "8.00",
                lifecycleStatus: LoyaltyCampaignStatus.ACTIVE,
                customerStatus: LoyaltyStatus.IN_PROGRESS,
            }),
            expect.objectContaining({
                campaignId: "count-2",
                progressValue: "2.00",
                targetValue: "10.00",
                remainingValue: "8.00",
            }),
        ]);
    });

    test("returns the same SPEND summaries as the per-campaign reads did", async () => {
        const { database } = countingDatabase(spendCampaigns);

        const result = await useCaseFor(database).executeList(
            "tenant-1",
            "customer-1",
        );

        expect(result.data).toEqual([
            expect.objectContaining({
                campaignId: "spend-1",
                metric: LoyaltyCampaignMetric.SPEND,
                progressValue: "4.00",
                targetValue: "50.00",
                remainingValue: "46.00",
                lifecycleStatus: LoyaltyCampaignStatus.ACTIVE,
                customerStatus: LoyaltyStatus.IN_PROGRESS,
            }),
            expect.objectContaining({
                campaignId: "spend-2",
                progressValue: "4.00",
                targetValue: "50.00",
                remainingValue: "46.00",
            }),
        ]);
    });

    test("reads the campaign once for a single-campaign read", async () => {
        const { database, queries } = countingDatabase(countCampaigns);

        await expect(
            useCaseFor(database).execute("tenant-1", "count-1", "customer-1"),
        ).resolves.toMatchObject({
            data: expect.objectContaining({ campaignId: "count-1" }),
        });
        expect(queries).toEqual([
            "campaign.findFirst:count-1",
            "ledger.count:count-1",
            "ledger.count:count-1",
            "claim.findFirst",
        ]);    });
});
