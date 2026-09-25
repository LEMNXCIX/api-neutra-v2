jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { Prisma } from "@prisma/client";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyRewardClaimStatus,
    LoyaltyStatus,
} from "@/core/entities/loyalty.entity";
import { Coupon, CouponType } from "@/core/entities/coupon.entity";
import { TenantType } from "@/core/entities/tenant.entity";
import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";
import { CreateLoyaltyCampaignUseCase } from "@/core/application/loyalty/create-loyalty-campaign.use-case";
import { TransitionLoyaltyCampaignUseCase } from "@/core/application/loyalty/transition-loyalty-campaign.use-case";
import { GetLoyaltyCampaignsUseCase } from "@/core/application/loyalty/get-loyalty-campaigns.use-case";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import { LoyaltyPresenter } from "@/core/application/dtos/responses/loyalty/loyalty.response";
import { LoyaltyCampaignLifecycleAction } from "@/core/application/dtos/requests/loyalty.request";

const now = new Date("2030-01-15T00:00:00.000Z");
const startsAt = new Date("2030-01-01T00:00:00.000Z");
const endsAt = new Date("2030-01-31T00:00:00.000Z");
const claimUntil = new Date("2030-02-10T00:00:00.000Z");

function tenant(overrides: Record<string, unknown> = {}) {
    return {
        id: "tenant-1",
        name: "Tenant One",
        slug: "tenant-one",
        type: TenantType.STORE,
        active: true,
        config: {},
        ...overrides,
    } as never;
}

function campaign(overrides: Record<string, unknown> = {}) {
    return {
        id: "campaign-1",
        tenantId: "tenant-1",
        name: "Store rewards",
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10.00",
        status: LoyaltyCampaignStatus.ACTIVE,
        startsAt,
        endsAt,
        claimUntil,
        rewardCouponId: "template-1",
        reward: reward(),
        rewardValidDays: 30,
        maxClaims: null,
        claimedCount: 0,
        createdAt: now,
        updatedAt: now,
        ...overrides,
    } as never;
}

function reward() {
    return {
        type: CouponType.PERCENT,
        value: 10,
        description: "Reward",
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
    };
}

function template(overrides: Record<string, unknown> = {}) {
    return {
        id: "template-1",
        tenantId: "tenant-1",
        code: "LOYALTY-TEMPLATE-1",
        type: CouponType.PERCENT,
        value: 10,
        description: "Reward",
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: null,
        usageCount: 0,
        active: true,
        expiresAt: claimUntil,
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

function repositorySetup() {
    const templates = [template()];
    const campaigns = [
        {
            id: "campaign-1",
            tenantId: "tenant-1",
            name: "Store rewards",
            description: null,
            source: LoyaltyCampaignSource.STORE,
            metric: LoyaltyCampaignMetric.COUNT,
            targetValue: new Prisma.Decimal("10.00"),
            status: LoyaltyCampaignStatus.DRAFT,
            startsAt,
            endsAt,
            claimUntil,
            rewardCouponId: "template-1",
            rewardCoupon: template(),
            rewardValidDays: 30,
            maxClaims: null,
            claimedCount: 0,
            createdAt: now,
            updatedAt: now,
        },
    ];
    const claims: Record<string, unknown>[] = [];
    let failCampaignCreate = false;
    const tx = {
        coupon: {
            findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
                templates.find(
                    (row) =>
                        row.id === where.id &&
                        row.tenantId === where.tenantId &&
                        row.isLoyaltyTemplate === true,
                ) ?? null,
            ),
            create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                const row = {
                    ...data,
                    id: `template-${templates.length + 1}`,
                    createdAt: now,
                    updatedAt: now,
                };
                templates.push(row as never);
                return row;
            }),
            updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
                const row = templates.find((item) => item.id === where.id);
                if (!row) return { count: 0 };
                Object.assign(row, data);
                return { count: 1 };
            }),
            deleteMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
                const index = templates.findIndex((item) => item.id === where.id);
                if (index < 0) return { count: 0 };
                templates.splice(index, 1);
                return { count: 1 };
            }),
        },
        loyaltyCampaign: {
            create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
                if (failCampaignCreate) throw new Error("campaign write failed");
                const row = {
                    ...data,
                    id: `campaign-${campaigns.length + 1}`,
                    targetValue: data.targetValue,
                    createdAt: now,
                    updatedAt: now,
                };
                campaigns.unshift(row as never);
                return row;
            }),
            findMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
                campaigns.filter((row) => row.tenantId === where.tenantId),
            ),
            findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
                campaigns.find(
                    (row) => row.id === where.id && row.tenantId === where.tenantId,
                ) ?? null,
            ),
            updateMany: jest.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
                const row = campaigns.find(
                    (item) => item.id === where.id && item.tenantId === where.tenantId,
                );
                if (!row) return { count: 0 };
                Object.assign(row, data);
                return { count: 1 };
            }),
            deleteMany: jest.fn(async ({ where }: { where: Record<string, unknown> }) => {
                const index = campaigns.findIndex(
                    (row) => row.id === where.id && row.tenantId === where.tenantId,
                );
                if (index < 0) return { count: 0 };
                campaigns.splice(index, 1);
                return { count: 1 };
            }),
        },
        loyaltyRewardClaim: {
            findFirst: jest.fn(async ({ where }: { where: Record<string, unknown> }) =>
                claims.find(
                    (row) =>
                        (row as Record<string, unknown>).tenantId === where.tenantId &&
                        (row as Record<string, unknown>).campaignId === where.campaignId &&
                        (row as Record<string, unknown>).userId === where.userId,
                ) ?? null,
            ),
            create: jest.fn(),
        },
        loyaltyLedgerEntry: {
            aggregate: jest.fn(async () => ({ _sum: { value: new Prisma.Decimal("0") } })),
        },
    };
    const database = {
        ...tx,
        $transaction: jest.fn(async (callback: (value: typeof tx) => Promise<unknown>) => {
            const templateSnapshot = [...templates];
            const campaignSnapshot = [...campaigns];
            try {
                return await callback(tx);
            } catch (error) {
                templates.splice(0, templates.length, ...templateSnapshot);
                campaigns.splice(0, campaigns.length, ...campaignSnapshot);
                throw error;
            }
        }),
    };
    return {
        repository: new PrismaLoyaltyRepository(database as never),
        templates,
        campaigns,
        claims,
        tx,
        database,
        setFailCampaignCreate(value: boolean) {
            failCampaignCreate = value;
        },
    };
}

function repositoryData() {
    return {
        name: "Store rewards",
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10",
        startsAt,
        endsAt,
        claimUntil,
        reward: reward(),
        rewardValidDays: 30,
    };
}

describe("loyalty campaign repository services", () => {
    test("creates a draft and non-redeemable shared template atomically", async () => {
        const setup = repositorySetup();
        setup.campaigns.length = 0;
        setup.templates.length = 0;

        await setup.repository.createCampaign("tenant-1", repositoryData());

        expect(setup.database.$transaction).toHaveBeenCalledTimes(1);
        expect(setup.templates[0]).toEqual(
            expect.objectContaining({
                tenantId: "tenant-1",
                code: expect.stringMatching(/^LOYALTY-/),
                ownerId: null,
                active: true,
                isReward: false,
                isLoyaltyTemplate: true,
                usageLimit: null,
                usageCount: 0,
                expiresAt: claimUntil,
            }),
        );
        expect(setup.campaigns[0]).toEqual(
            expect.objectContaining({
                tenantId: "tenant-1",
                status: LoyaltyCampaignStatus.DRAFT,
                rewardCouponId: setup.templates[0]!.id,
            }),
        );
    });

    test("rolls back the template when campaign creation fails", async () => {
        const setup = repositorySetup();
        setup.campaigns.length = 0;
        setup.templates.length = 0;
        setup.setFailCampaignCreate(true);

        await expect(
            setup.repository.createCampaign("tenant-1", repositoryData()),
        ).rejects.toThrow("campaign write failed");
        expect(setup.templates).toHaveLength(0);
        expect(setup.campaigns).toHaveLength(0);
    });

    test("updates a draft campaign and its template in one transaction", async () => {
        const setup = repositorySetup();

        await expect(
            setup.repository.updateCampaign("tenant-1", "campaign-1", {
                reward: reward(),
                claimUntil: new Date("2030-03-01T00:00:00.000Z"),
            }),
        ).resolves.toMatchObject({ id: "campaign-1" });
        expect(setup.tx.coupon.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ id: "template-1", tenantId: "tenant-1" }),
                data: expect.objectContaining({
                    active: true,
                    isReward: false,
                    isLoyaltyTemplate: true,
                    usageLimit: null,
                }),
            }),
        );
        expect(setup.tx.loyaltyCampaign.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ tenantId: "tenant-1" }),
            }),
        );
    });

    test("looks up a campaign claim with tenant and campaign scope", async () => {
        const setup = repositorySetup();
        setup.claims.push({
            id: "claim-1",
            tenantId: "tenant-1",
            campaignId: "campaign-1",
            userId: "customer-1",
            couponId: "coupon-1",
            status: LoyaltyRewardClaimStatus.CLAIMED,
            createdAt: now,
            updatedAt: now,
            coupon: template({ id: "coupon-1", ownerId: "customer-1", isReward: true, isLoyaltyTemplate: false }),
        });

        await expect(
            setup.repository.findCampaignRewardClaim(
                "tenant-1",
                "campaign-1",
                "customer-1",
            ),
        ).resolves.toMatchObject({ campaignId: "campaign-1" });
        expect(setup.tx.loyaltyRewardClaim.findFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                where: {
                    tenantId: "tenant-1",
                    campaignId: "campaign-1",
                    userId: "customer-1",
                },
            }),
        );
    });
});

describe("loyalty campaign application services", () => {
    test("requires both tenant features and a compatible source", async () => {
        const loyaltyRepository = { createCampaign: jest.fn() };
        const tenantRepository = { findById: jest.fn().mockResolvedValue(tenant()) };
        const featureRepository = {
            getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true }),
        };
        const useCase = new CreateLoyaltyCampaignUseCase(
            loyaltyRepository as never,
            tenantRepository as never,
            featureRepository as never,
        );

        await expect(
            useCase.execute("tenant-1", {
                ...repositoryData(),
                source: LoyaltyCampaignSource.BOOKING,
            }),
        ).rejects.toMatchObject({ code: "LOYALTY_REQUIRES_COUPONS" });
        expect(loyaltyRepository.createCampaign).not.toHaveBeenCalled();

        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: true,
            COUPONS: true,
        });
        await expect(
            useCase.execute("tenant-1", {
                ...repositoryData(),
                source: LoyaltyCampaignSource.BOOKING,
            }),
        ).rejects.toMatchObject({
            code: "LOYALTY_CAMPAIGN_SOURCE_NOT_COMPATIBLE",
        });
    });

    test("revalidates source and features before activation", async () => {
        const repository = {
            getCampaign: jest.fn().mockResolvedValue(
                campaign({ status: LoyaltyCampaignStatus.DRAFT }),
            ),
            transitionCampaignStatus: jest.fn().mockResolvedValue(
                campaign({ status: LoyaltyCampaignStatus.ACTIVE }),
            ),
        };
        const useCase = new TransitionLoyaltyCampaignUseCase(
            repository as never,
            { findById: jest.fn().mockResolvedValue(tenant()) } as never,
            {
                getTenantFeatureStatus: jest.fn().mockResolvedValue({
                    LOYALTY: true,
                    COUPONS: true,
                }),
            } as never,
        );

        await expect(
            useCase.activate("tenant-1", "campaign-1"),
        ).resolves.toMatchObject({
            data: { status: LoyaltyCampaignStatus.ACTIVE },
        });
        expect(repository.transitionCampaignStatus).toHaveBeenCalledWith(
            "tenant-1",
            "campaign-1",
            LoyaltyCampaignStatus.DRAFT,
            LoyaltyCampaignStatus.ACTIVE,
        );
    });

    test.each([
        ["NOT_STARTED", new Date("2030-02-01T00:00:00.000Z"), "0.00", null],
        ["IN_PROGRESS", new Date("2030-01-15T00:00:00.000Z"), "4.00", null],
        ["READY", new Date("2030-01-15T00:00:00.000Z"), "10.00", null],
        ["EXPIRED", new Date("2030-03-01T00:00:00.000Z"), "10.00", null],
    ])("maps %s customer summary status and Decimal values", async (
        expected,
        at,
        progressValue,
        _claim,
    ) => {
        jest.useFakeTimers().setSystemTime(new Date(at));
        const repository = {
            getCampaign: jest.fn().mockResolvedValue(
                campaign(
                    expected === "NOT_STARTED"
                        ? {
                              startsAt: new Date("2030-02-02T00:00:00.000Z"),
                              endsAt: new Date("2030-03-01T00:00:00.000Z"),
                              claimUntil: new Date("2030-03-10T00:00:00.000Z"),
                          }
                        : {},
                ),
            ),
            getCampaignProgress: jest.fn().mockResolvedValue({
                campaignId: "campaign-1",
                userId: "customer-1",
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue,
                targetValue: "10.00",
                reachedTarget: progressValue === "10.00",
            }),
            findCampaignRewardClaim: jest.fn().mockResolvedValue(null),
        };
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            repository as never,
            { findById: jest.fn().mockResolvedValue(tenant()) } as never,
            {
                getTenantFeatureStatus: jest.fn().mockResolvedValue({
                    LOYALTY: true,
                    COUPONS: true,
                }),
            } as never,
        );

        await expect(
            useCase.execute("tenant-1", "campaign-1", "customer-1"),
        ).resolves.toMatchObject({
            data: {
                campaignId: "campaign-1",
                name: "Store rewards",
                source: LoyaltyCampaignSource.STORE,
                startsAt:
                    expected === "NOT_STARTED"
                        ? new Date("2030-02-02T00:00:00.000Z")
                        : startsAt,
                endsAt:
                    expected === "NOT_STARTED"
                        ? new Date("2030-03-01T00:00:00.000Z")
                        : endsAt,
                claimUntil:
                    expected === "NOT_STARTED"
                        ? new Date("2030-03-10T00:00:00.000Z")
                        : claimUntil,
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue,
                targetValue: "10.00",
                remainingValue:
                    expected === "READY" || expected === "EXPIRED"
                        ? "0.00"
                        : expected === "IN_PROGRESS"
                          ? "6.00"
                          : "10.00",
                customerStatus: expected,
            },
        });
        jest.useRealTimers();
    });

    test("returns CLAIMED with the campaign coupon", async () => {
        jest.useFakeTimers().setSystemTime(now);
        const coupon = template({ id: "coupon-1", ownerId: "customer-1", isReward: true, isLoyaltyTemplate: false });
        const repository = {
            getCampaign: jest.fn().mockResolvedValue(campaign()),
            getCampaignProgress: jest.fn().mockResolvedValue({
                campaignId: "campaign-1",
                userId: "customer-1",
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue: "10.00",
                targetValue: "10.00",
                reachedTarget: true,
            }),
            findCampaignRewardClaim: jest.fn().mockResolvedValue({
                id: "claim-1",
                tenantId: "tenant-1",
                campaignId: "campaign-1",
                userId: "customer-1",
                couponId: coupon.id,
                status: LoyaltyRewardClaimStatus.CLAIMED,
                createdAt: now,
                updatedAt: now,
                coupon,
            }),
        };
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            repository as never,
            { findById: jest.fn().mockResolvedValue(tenant()) } as never,
            { getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true, COUPONS: true }) } as never,
        );

        await expect(
            useCase.execute("tenant-1", "campaign-1", "customer-1"),
        ).resolves.toMatchObject({
            data: {
                customerStatus: LoyaltyStatus.CLAIMED,
                coupon: { id: "coupon-1" },
            },
        });
        jest.useRealTimers();
    });

    test("keeps tenant campaign lists isolated and claims a selected campaign idempotently", async () => {
        const listRepository = {
            listCampaigns: jest.fn(async (tenantId: string) =>
                tenantId === "tenant-1" ? [campaign()] : [],
            ),
        };
        const tenantRepository = { findById: jest.fn().mockResolvedValue(tenant()) };
        const featureRepository = {
            getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true, COUPONS: true }),
        };
        const listUseCase = new GetLoyaltyCampaignsUseCase(
            listRepository as never,
            tenantRepository as never,
            featureRepository as never,
        );
        await expect(listUseCase.execute("tenant-1")).resolves.toMatchObject({
            data: [expect.objectContaining({ tenantId: "tenant-1" })],
        });
        expect(listRepository.listCampaigns).toHaveBeenCalledWith("tenant-1");

        const result = {
            claim: { id: "claim-1", campaignId: "campaign-1" },
            coupon: template({ id: "coupon-1" }),
        };
        const claimRepository = {
            claimCampaignReward: jest.fn().mockResolvedValue(result),
        };
        const claimUseCase = new ClaimLoyaltyRewardUseCase(
            claimRepository as never,
            tenantRepository as never,
            featureRepository as never,
        );
        await expect(
            claimUseCase.execute("tenant-1", "campaign-1", "customer-1"),
        ).resolves.toMatchObject({ data: result });
        await expect(
            claimUseCase.execute("tenant-1", "campaign-1", "customer-1"),
        ).resolves.toMatchObject({ data: result });
        expect(claimRepository.claimCampaignReward).toHaveBeenCalledTimes(2);
    });

    test("hides DRAFT and unclaimed ARCHIVED campaigns from customers", async () => {
        const archivedClaim = {
            id: "claim-archived",
            tenantId: "tenant-1",
            campaignId: "archived-claimed",
            userId: "customer-1",
            couponId: "coupon-archived",
            status: LoyaltyRewardClaimStatus.CLAIMED,
            createdAt: now,
            updatedAt: now,
            coupon: template({ id: "coupon-archived", ownerId: "customer-1", isReward: true, isLoyaltyTemplate: false }),
        };
        const repository = {
            listCampaigns: jest.fn().mockResolvedValue([
                campaign({ id: "draft", status: LoyaltyCampaignStatus.DRAFT }),
                campaign({ id: "archived-unclaimed", status: LoyaltyCampaignStatus.ARCHIVED }),
                campaign({ id: "archived-claimed", status: LoyaltyCampaignStatus.ARCHIVED }),
                campaign({ id: "active", status: LoyaltyCampaignStatus.ACTIVE }),
                campaign({ id: "ended", status: LoyaltyCampaignStatus.ENDED }),
            ]),
            getCampaign: jest.fn().mockImplementation(async (_tenantId, campaignId) =>
                campaign({ id: campaignId, status: campaignId === "draft" ? LoyaltyCampaignStatus.DRAFT : LoyaltyCampaignStatus.ARCHIVED }),
            ),
            getCampaignProgress: jest.fn().mockResolvedValue({
                campaignId: "campaign-1",
                userId: "customer-1",
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue: "0.00",
                targetValue: "10.00",
                reachedTarget: false,
            }),
            findCampaignRewardClaim: jest.fn().mockImplementation(async (_tenantId, campaignId) =>
                campaignId === "archived-claimed" ? archivedClaim : null,
            ),
        };
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            repository as never,
            { findById: jest.fn().mockResolvedValue(tenant()) } as never,
            { getTenantFeatureStatus: jest.fn().mockResolvedValue({ LOYALTY: true, COUPONS: true }) } as never,
        );

        const result = await useCase.executeList("tenant-1", "customer-1");
        expect(result.data?.map((summary) => summary.campaignId)).toEqual([
            "archived-claimed",
            "active",
            "ended",
        ]);
        await expect(
            useCase.execute("tenant-1", "draft", "customer-1"),
        ).rejects.toMatchObject({ code: "ENTITY_NOT_FOUND" });
        await expect(
            useCase.execute("tenant-1", "archived-unclaimed", "customer-1"),
        ).rejects.toMatchObject({ code: "ENTITY_NOT_FOUND" });
    });

    test("presents campaign reward and claim metadata", () => {
        const coupon = template({
            id: "coupon-1",
            ownerId: "customer-1",
            isReward: true,
            isLoyaltyTemplate: false,
        }) as unknown as Coupon;
        const presented =
            LoyaltyPresenter.toCustomerCampaignSummaryResponse({
            campaignId: "campaign-1",
            name: "Store rewards",
            source: LoyaltyCampaignSource.STORE,
            startsAt,
            endsAt,
            claimUntil,
            metric: LoyaltyCampaignMetric.COUNT,
            progressValue: "10.00",
            targetValue: "10.00",
            remainingValue: "0.00",
            lifecycleStatus: LoyaltyCampaignStatus.ARCHIVED,
            customerStatus: LoyaltyStatus.CLAIMED,
            claim: {
                id: "claim-1",
                tenantId: "tenant-1",
                campaignId: "campaign-1",
                userId: "customer-1",
                couponId: coupon.id,
                status: LoyaltyRewardClaimStatus.CLAIMED,
                createdAt: now,
                updatedAt: now,
                coupon,
            },
            coupon,
        });
        expect(presented).toMatchObject({
            campaignId: "campaign-1",
            name: "Store rewards",
            source: LoyaltyCampaignSource.STORE,
            startsAt,
            endsAt,
            claimUntil,
        });
        expect(presented.claim).toMatchObject({
            id: "claim-1",
            campaignId: "campaign-1",
            couponId: "coupon-1",
        });
        expect(presented.coupon).toMatchObject({ id: "coupon-1" });
        expect(
            LoyaltyPresenter.toCampaignResponse(campaign()).reward,
        ).toMatchObject({ type: CouponType.PERCENT, value: 10 });
    });

    test("presents campaign summaries and lifecycle contracts", () => {
        expect(
            LoyaltyPresenter.toCampaignResponse(campaign()),
        ).toMatchObject({
            id: "campaign-1",
            targetValue: "10.00",
        });
        expect(
            LoyaltyPresenter.toCustomerCampaignSummaryResponse({
                campaignId: "campaign-1",
                name: "Store rewards",
                source: LoyaltyCampaignSource.STORE,
                startsAt,
                endsAt,
                claimUntil,
                metric: LoyaltyCampaignMetric.COUNT,
                progressValue: "4.00",
                targetValue: "10.00",
                remainingValue: "6.00",
                lifecycleStatus: LoyaltyCampaignStatus.ACTIVE,
                customerStatus: LoyaltyStatus.IN_PROGRESS,
            }),
        ).toMatchObject({
            campaignId: "campaign-1",
            name: "Store rewards",
            source: LoyaltyCampaignSource.STORE,
            startsAt,
            endsAt,
            claimUntil,
            progress: "4.00",
            target: "10.00",
            remaining: "6.00",
            lifecycleStatus: LoyaltyCampaignStatus.ACTIVE,
            customerStatus: LoyaltyStatus.IN_PROGRESS,
        });
        expect(LoyaltyCampaignLifecycleAction.ACTIVATE).toBe("activate");
    });
});
