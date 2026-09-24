import { LoyaltyController } from "@/interface-adapters/controllers/loyalty.controller";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import { GetLoyaltyConfigUseCase } from "@/core/application/loyalty/get-loyalty-config.use-case";
import { UpdateLoyaltyConfigUseCase } from "@/core/application/loyalty/update-loyalty-config.use-case";
import { GetAllTenantsLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-all-tenants-loyalty-overview.use-case";
import { Tenant, TenantType } from "@/core/entities/tenant.entity";
import { LoyaltyStatus, LoyaltyRewardClaimStatus } from "@/core/entities/loyalty.entity";
import { CouponType } from "@/core/entities/coupon.entity";
import { Success } from "@/core/utils/use-case-result";
import {
    UpdateLoyaltyConfigDTO,
    UpdateLoyaltyConfigDto,
} from "@/core/application/dtos/requests/loyalty.request";
import { plainToInstance } from "class-transformer";

function tenant(overrides: Partial<Tenant> = {}): Tenant {
    return {
        id: "tenant-1",
        name: "Tenant One",
        slug: "tenant-one",
        type: TenantType.BOOKING,
        active: true,
        config: {},
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
        ...overrides,
    } as Tenant;
}

function coupon(overrides: Record<string, unknown> = {}) {
    return {
        id: "coupon-1",
        tenantId: "tenant-1",
        code: "REWARD-1",
        type: CouponType.PERCENT,
        value: 10,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01T00:00:00.000Z"),
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
        ...overrides,
    };
}

describe("loyalty customer use cases", () => {
    test("returns a tenant-scoped summary for the authenticated customer", async () => {
        const loyaltyRepository = {
            getPointsBalance: jest.fn().mockResolvedValue(10),
            findRewardClaim: jest.fn().mockResolvedValue(null),
        };
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            loyaltyRepository as never,
            {
                findById: jest.fn().mockResolvedValue(
                    tenant({
                        config: {
                            loyalty: {
                                targetPoints: 10,
                                rewardCouponId: "template-1",
                            },
                        },
                    }),
                ),
            } as never,
        );

        const result = await useCase.execute("tenant-1", "customer-1");

        expect(loyaltyRepository.getPointsBalance).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
        );
        expect(loyaltyRepository.findRewardClaim).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
        );
        expect(result.data).toMatchObject({
            points: 10,
            targetPoints: 10,
            remaining: 0,
            status: LoyaltyStatus.READY,
        });
    });

    test("preserves the claimed target after the configured target is lowered", async () => {
        const claim = {
            id: "claim-1",
            tenantId: "tenant-1",
            userId: "customer-1",
            milestone: 15,
            couponId: "coupon-1",
            status: LoyaltyRewardClaimStatus.CLAIMED,
            createdAt: new Date(),
            updatedAt: new Date(),
            coupon: coupon({ ownerId: "customer-1", isReward: true }),
        };
        const loyaltyRepository = {
            getPointsBalance: jest.fn().mockResolvedValue(12),
            findRewardClaim: jest.fn().mockResolvedValue(claim),
        };
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            loyaltyRepository as never,
            {
                findById: jest.fn().mockResolvedValue(
                    tenant({
                        config: {
                            loyalty: {
                                targetPoints: 10,
                                rewardCouponId: "template-1",
                            },
                        },
                    }),
                ),
            } as never,
        );

        await expect(useCase.execute("tenant-1", "customer-1")).resolves.toMatchObject({
            data: {
                points: 12,
                targetPoints: 15,
                remaining: 0,
                status: LoyaltyStatus.CLAIMED,
                coupon: expect.objectContaining({ id: "coupon-1" }),
            },
        });
        expect(loyaltyRepository.findRewardClaim).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
        );
    });

    test("marks a customer with no configured template as not configured", async () => {
        const useCase = new GetCustomerLoyaltySummaryUseCase(
            {
                getPointsBalance: jest.fn().mockResolvedValue(10),
                findRewardClaim: jest.fn().mockResolvedValue(null),
            } as never,
            { findById: jest.fn().mockResolvedValue(tenant()) } as never,
        );

        await expect(useCase.execute("tenant-1", "customer-1")).resolves.toMatchObject({
            data: { status: LoyaltyStatus.NOT_CONFIGURED },
        });
    });

    test("passes the authenticated identity and configured target to an idempotent claim", async () => {
        const claim = {
            id: "claim-1",
            tenantId: "tenant-1",
            userId: "customer-1",
            milestone: 10,
            couponId: "coupon-1",
            status: LoyaltyRewardClaimStatus.CLAIMED,
            createdAt: new Date(),
            updatedAt: new Date(),
            coupon: coupon({ ownerId: "customer-1", isReward: true }),
        };
        const loyaltyRepository = {
            claimReward: jest.fn().mockResolvedValue({
                claim,
                coupon: claim.coupon,
            }),
        };
        const useCase = new ClaimLoyaltyRewardUseCase(
            loyaltyRepository as never,
            {
                findById: jest.fn().mockResolvedValue(
                    tenant({
                        config: {
                            loyalty: {
                                targetPoints: 10,
                                rewardCouponId: "template-1",
                            },
                        },
                    }),
                ),
            } as never,
        );

        await useCase.execute("tenant-1", "customer-1");

        expect(loyaltyRepository.claimReward).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
            "template-1",
            10,
        );
    });
});

describe("loyalty configuration", () => {
    test("merges only the loyalty section and preserves tenant config", async () => {
        const update = jest.fn().mockResolvedValue(tenant());
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(
                    tenant({
                        config: {
                            branding: { primaryColor: "#fff" },
                            settings: { currency: "USD" },
                            features: { OTHER: true },
                        },
                    }),
                ),
                update,
            } as never,
            {
                findById: jest.fn().mockResolvedValue(
                    coupon({ ownerId: undefined, isReward: false }),
                ),
            } as never,
        );

        const data: UpdateLoyaltyConfigDTO = {
            targetPoints: 15,
            rewardCouponId: "template-1",
        };
        await useCase.execute("tenant-1", data);

        expect(update).toHaveBeenCalledWith("tenant-1", {
            config: {
                branding: { primaryColor: "#fff" },
                settings: { currency: "USD" },
                features: { OTHER: true },
                loyalty: {
                    targetPoints: 15,
                    rewardCouponId: "template-1",
                },
            },
        });
    });

    test.each([
        { targetPoints: 0 },
        { targetPoints: 1.5 },
        { targetPoints: Number.MAX_SAFE_INTEGER + 1 },
        { rewardCouponId: "" },
        { userId: "customer-2" },
    ])("rejects invalid configuration %j", async (data) => {
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(tenant()),
                update: jest.fn(),
            } as never,
            { findById: jest.fn() } as never,
        );

        await expect(
            useCase.execute("tenant-1", data as UpdateLoyaltyConfigDTO),
        ).rejects.toMatchObject({ code: expect.stringMatching(/INVALID/) });
    });

    test("accepts a validated DTO with omitted optional fields", async () => {
        const update = jest.fn().mockResolvedValue(tenant());
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(tenant()),
                update,
            } as never,
            {
                findById: jest.fn().mockResolvedValue(
                    coupon({ ownerId: undefined, isReward: false }),
                ),
            } as never,
        );
        const data = plainToInstance(UpdateLoyaltyConfigDto, {
            rewardCouponId: "template-1",
        });

        await useCase.execute("tenant-1", data);

        expect(update).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({
                config: expect.objectContaining({
                    loyalty: {
                        targetPoints: 10,
                        rewardCouponId: "template-1",
                    },
                }),
            }),
        );
    });

    test("rejects a personal or reward coupon as a template", async () => {
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(tenant()),
                update: jest.fn(),
            } as never,
            {
                findById: jest
                    .fn()
                    .mockResolvedValue(
                        coupon({ ownerId: "customer-1", isReward: true }),
                    ),
            } as never,
        );

        await expect(
            useCase.execute("tenant-1", {
                rewardCouponId: "template-1",
            }),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_COUPON" });
    });

    test.each([
        ["inactive", { active: false }],
        ["expired", { expiresAt: new Date("2000-01-01T00:00:00.000Z") }],
    ])("rejects an %s shared reward template", async (_label, overrides) => {
        const update = jest.fn();
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(tenant()),
                update,
            } as never,
            {
                findById: jest
                    .fn()
                    .mockResolvedValue(coupon(overrides)),
            } as never,
        );

        await expect(
            useCase.execute("tenant-1", {
                rewardCouponId: "template-1",
            }),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_COUPON" });
        expect(update).not.toHaveBeenCalled();
    });

    test("revalidates an existing template on a target-only update", async () => {
        const update = jest.fn();
        const useCase = new UpdateLoyaltyConfigUseCase(
            {
                findById: jest.fn().mockResolvedValue(
                    tenant({
                        config: {
                            loyalty: {
                                targetPoints: 20,
                                rewardCouponId: "template-1",
                            },
                        },
                    }),
                ),
                update,
            } as never,
            {
                findById: jest
                    .fn()
                    .mockResolvedValue(coupon({ active: false })),
            } as never,
        );

        await expect(
            useCase.execute("tenant-1", { targetPoints: 15 }),
        ).rejects.toMatchObject({ code: "INVALID_LOYALTY_REWARD_COUPON" });
        expect(update).not.toHaveBeenCalled();
    });
});

describe("cross-tenant loyalty overview", () => {
    test("keeps disabled tenants visible", async () => {
        const loyaltyRepository = {
            getTenantStats: jest.fn().mockImplementation(async (tenantId) => ({
                tenantId,
                totalPoints: 0,
                totalClaims: 0,
                activeCustomers: 0,
            })),
            findRecentLedgerEntries: jest.fn().mockResolvedValue([]),
            findRecentRewardClaims: jest.fn().mockResolvedValue([]),
        };
        const useCase = new GetAllTenantsLoyaltyOverviewUseCase(
            loyaltyRepository as never,
            {
                findAll: jest.fn().mockResolvedValue([
                    tenant(),
                    tenant({
                        id: "tenant-disabled",
                        slug: "disabled",
                        active: false,
                    }),
                ]),
            } as never,
        );

        const result = await useCase.execute();

        expect(result.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    tenantId: "tenant-disabled",
                    active: false,
                }),
            ]),
        );
    });
});

describe("loyalty controller identity and scope", () => {
    function controller() {
        const summary = { execute: jest.fn() };
        const claim = { execute: jest.fn() };
        const tenantOverview = { execute: jest.fn() };
        const config = { execute: jest.fn() };
        const updateConfig = { execute: jest.fn() };
        const allTenants = { execute: jest.fn() };
        return {
            summary,
            claim,
            tenantOverview,
            config,
            updateConfig,
            allTenants,
            instance: new LoyaltyController(
                summary as never,
                claim as never,
                tenantOverview as never,
                config as never,
                updateConfig as never,
                allTenants as never,
            ),
        };
    }

    test("never takes customer identity from the claim body or query", async () => {
        const setup = controller();
        setup.claim.execute.mockResolvedValue(
            Success({
                claim: {
                    id: "claim-1",
                    tenantId: "tenant-1",
                    userId: "customer-1",
                    milestone: 10,
                    couponId: "coupon-1",
                    status: LoyaltyRewardClaimStatus.CLAIMED,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                coupon: coupon({ ownerId: "customer-1", isReward: true }),
            }),
        );
        const response = { json: jest.fn().mockReturnThis() } as never;

        await setup.instance.claimReward(
            {
                tenantId: "tenant-1",
                user: { id: "customer-1" },
                body: { userId: "customer-2" },
                query: { userId: "customer-2" },
            } as never,
            response,
        );

        expect(setup.claim.execute).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
        );
    });

    test("presents the tenant overview with safe ledger and claim data", async () => {
        const setup = controller();
        setup.tenantOverview.execute.mockResolvedValue(
            Success({
                tenantId: "tenant-1",
                name: "Tenant One",
                slug: "tenant-one",
                type: "BOOKING",
                active: true,
                config: { targetPoints: 10, rewardCouponId: "template-1" },
                stats: {
                    tenantId: "tenant-1",
                    totalPoints: 10,
                    totalClaims: 1,
                    activeCustomers: 1,
                },
                recentLedger: [
                    {
                        id: "entry-1",
                        tenantId: "tenant-1",
                        userId: "customer-1",
                        sourceAppointmentId: "appointment-1",
                        points: 10,
                        reason: "appointment.completed",
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    },
                ],
                recentClaims: [],
            }),
        );
        const response = { json: jest.fn().mockReturnThis() };

        await setup.instance.getTenantSummary(
            { tenantId: "tenant-1" } as never,
            response as never,
        );

        expect(response.json).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    tenantId: "tenant-1",
                    recentLedger: [
                        expect.objectContaining({
                            sourceAppointmentId: "appointment-1",
                        }),
                    ],
                }),
            }),
        );
    });

    test("requires a super administrator for cross-tenant overview", async () => {
        const setup = controller();
        const response = { json: jest.fn().mockReturnThis() } as never;

        await expect(
            setup.instance.getAllTenants(
                {
                    user: {
                        id: "admin-1",
                        role: { name: "ADMIN" },
                    },
                } as never,
                response,
            ),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(setup.allTenants.execute).not.toHaveBeenCalled();
    });
});
