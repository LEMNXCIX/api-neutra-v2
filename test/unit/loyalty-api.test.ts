import express, {
    Application,
    NextFunction,
    Request,
    Response,
    Router,
} from "express";
import request from "supertest";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { LoyaltyController } from "@/interface-adapters/controllers/loyalty.controller";
import { loyaltyRoutes } from "@/infrastructure/routes/loyalty.routes";
import { authenticate } from "@/middleware/authenticate.middleware";
import {
    requireConcreteTenantContext,
    requireTenantFeature,
    requireTenantType,
} from "@/middleware/tenant-feature.middleware";
import { requirePermission } from "@/middleware/authorization.middleware";
import { GetCustomerLoyaltySummaryUseCase } from "@/core/application/loyalty/get-customer-loyalty-summary.use-case";
import { ClaimLoyaltyRewardUseCase } from "@/core/application/loyalty/claim-loyalty-reward.use-case";
import { GetTenantLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-tenant-loyalty-overview.use-case";
import { UpdateLoyaltyConfigUseCase } from "@/core/application/loyalty/update-loyalty-config.use-case";
import { GetAllTenantsLoyaltyOverviewUseCase } from "@/core/application/loyalty/get-all-tenants-loyalty-overview.use-case";
import { Tenant, TenantType } from "@/core/entities/tenant.entity";
import {
    LoyaltyCampaignMetric,
    LoyaltyCampaignSource,
    LoyaltyCampaignStatus,
    LoyaltyRewardClaimStatus,
    LoyaltyStatus,
    MAX_LOYALTY_PRISMA_INT,
} from "@/core/entities/loyalty.entity";
import { CouponType } from "@/core/entities/coupon.entity";
import { Success } from "@/core/utils/use-case-result";
import {
    CreateLoyaltyCampaignDto,
    LoyaltyRewardDefinitionDto,
    UpdateLoyaltyCampaignDto,
    UpdateLoyaltyConfigDTO,
    UpdateLoyaltyConfigDto,
} from "@/core/application/dtos/requests/loyalty.request";
import { ROLE_CONSTANTS } from "@/core/domain/constants";

jest.mock("@/middleware/authenticate.middleware", () => ({
    authenticate: jest.fn(
        (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
}));
jest.mock("@/middleware/tenant-feature.middleware", () => ({
    requireConcreteTenantContext: jest.fn(
        (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
    requireTenantFeature: jest.fn(
        () => (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
    requireTenantType: jest.fn(
        () => (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
}));
jest.mock("@/middleware/authorization.middleware", () => ({
    requirePermission: jest.fn(
        () => (_req: Request, _res: Response, next: NextFunction) => next(),
    ),
}));

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

function featureRepository() {
    return {
        getTenantFeatureStatus: jest
            .fn()
            .mockResolvedValue({ LOYALTY: true, COUPONS: true }),
    } as never;
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

function campaign(overrides: Record<string, unknown> = {}) {
    return {
        id: "campaign-1",
        tenantId: "tenant-1",
        name: "Store rewards",
        description: null,
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10.00",
        status: LoyaltyCampaignStatus.DRAFT,
        startsAt: new Date("2030-01-01T00:00:00.000Z"),
        endsAt: new Date("2030-01-31T00:00:00.000Z"),
        claimUntil: new Date("2030-02-10T00:00:00.000Z"),
        rewardCouponId: "template-1",
        reward: {
            type: CouponType.PERCENT,
            value: 10,
            description: "Reward",
            minPurchaseAmount: null,
            maxDiscountAmount: null,
            applicableProducts: [],
            applicableCategories: [],
            applicableServices: [],
        },
        rewardValidDays: 30,
        maxClaims: null,
        claimedCount: 0,
        createdAt: new Date("2030-01-01T00:00:00.000Z"),
        updatedAt: new Date("2030-01-01T00:00:00.000Z"),
        ...overrides,
    };
}

function customerSummary(overrides: Record<string, unknown> = {}) {
    return {
        campaignId: "campaign-1",
        metric: LoyaltyCampaignMetric.COUNT,
        progressValue: "4.00",
        targetValue: "10.00",
        remainingValue: "6.00",
        lifecycleStatus: LoyaltyCampaignStatus.ACTIVE,
        customerStatus: LoyaltyStatus.IN_PROGRESS,
        ...overrides,
    };
}

function tenantCampaignOverview(overrides: Record<string, unknown> = {}) {
    return {
        tenantId: "tenant-1",
        name: "Tenant One",
        slug: "tenant-one",
        type: TenantType.STORE,
        active: true,
        campaigns: [campaign()],
        stats: {
            campaignCount: 1,
            activeCampaignCount: 0,
            endedCampaignCount: 0,
            archivedCampaignCount: 0,
            totalClaims: 0,
            totalPoints: 0,
            activeCustomers: 0,
        },
        ...overrides,
    };
}

function campaignRequest() {
    return {
        name: "Store rewards",
        description: "Reward visits",
        source: LoyaltyCampaignSource.STORE,
        metric: LoyaltyCampaignMetric.COUNT,
        targetValue: "10",
        startsAt: "2030-01-01T00:00:00.000Z",
        endsAt: "2030-01-31T00:00:00.000Z",
        claimUntil: "2030-02-10T00:00:00.000Z",
        reward: {
            type: CouponType.PERCENT,
            value: 10,
            applicableProducts: [],
            applicableCategories: [],
            applicableServices: [],
        },
        rewardValidDays: 30,
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
            featureRepository(),
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
            featureRepository(),
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
            featureRepository(),
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
            featureRepository(),
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
            listCampaigns: jest.fn().mockResolvedValue([]),
            getCampaignStats: jest.fn(),
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

describe("loyalty campaign HTTP API", () => {
    function controller() {
        const customer = {
            executeList: jest.fn(),
            executeCampaign: jest.fn(),
        };
        const claim = { executeCampaign: jest.fn() };
        const campaigns = { execute: jest.fn() };
        const create = { execute: jest.fn() };
        const update = { execute: jest.fn() };
        const transition = {
            execute: jest.fn(),
            deleteDraft: jest.fn(),
        };
        const tenantOverview = { execute: jest.fn() };
        const allTenants = { execute: jest.fn() };
        return {
            customer,
            claim,
            campaigns,
            create,
            update,
            transition,
            tenantOverview,
            allTenants,
            instance: new LoyaltyController(
                customer as never,
                claim as never,
                campaigns as never,
                create as never,
                update as never,
                transition as never,
                tenantOverview as never,
                allTenants as never,
            ),
        };
    }

    function appWith(setup: ReturnType<typeof controller>) {
        const app = express();
        app.use(express.json());
        app.use((req, _res, next) => {
            Object.assign(req, {
                tenantId: "tenant-1",
                tenant: {
                    id: "tenant-1",
                    type: TenantType.STORE,
                    active: true,
                },
                user: {
                    id: "customer-1",
                    role: {
                        name: ROLE_CONSTANTS.SUPER_ADMIN,
                        permissions: [],
                    },
                },
            });
            next();
        });
        loyaltyRoutes(app, setup.instance);
        return app;
    }

    test("maps campaign endpoints to use cases with authenticated identity and HTTP status codes", async () => {
        const setup = controller();
        const selectedCampaign = campaign();
        const selectedSummary = customerSummary();
        const claim = {
            id: "claim-1",
            campaignId: "campaign-1",
            couponId: "coupon-1",
            status: LoyaltyRewardClaimStatus.CLAIMED,
            createdAt: new Date("2030-01-15T00:00:00.000Z"),
            updatedAt: new Date("2030-01-15T00:00:00.000Z"),
        };
        setup.customer.executeList.mockResolvedValue(
            Success([selectedSummary]),
        );
        setup.customer.executeCampaign.mockResolvedValue(
            Success(selectedSummary),
        );
        setup.claim.executeCampaign.mockResolvedValue(
            Success({
                claim,
                coupon: coupon({ ownerId: "customer-1", isReward: true }),
            }),
        );
        setup.campaigns.execute.mockResolvedValue(Success([selectedCampaign]));
        setup.create.execute.mockResolvedValue(Success(selectedCampaign));
        setup.update.execute.mockResolvedValue(Success(selectedCampaign));
        setup.transition.execute.mockResolvedValue(Success(selectedCampaign));
        setup.transition.deleteDraft.mockResolvedValue(Success(null));
        setup.tenantOverview.execute.mockResolvedValue(
            Success(tenantCampaignOverview()),
        );
        setup.allTenants.execute.mockResolvedValue(
            Success([
                tenantCampaignOverview(),
                tenantCampaignOverview({
                    tenantId: "tenant-disabled",
                    active: false,
                }),
            ]),
        );
        const app = appWith(setup);

        await request(app)
            .get("/api/loyalty/me?userId=customer-2")
            .expect(200);
        await request(app)
            .get("/api/loyalty/me/campaigns/campaign-1")
            .expect(200);
        await request(app)
            .post("/api/loyalty/me/campaigns/campaign-1/claim?userId=customer-2")
            .send({ userId: "customer-2" })
            .expect(200);
        await request(app).get("/api/loyalty/admin/campaigns").expect(200);
        await request(app)
            .post("/api/loyalty/admin/campaigns")
            .send(campaignRequest())
            .expect(201);
        await request(app)
            .get("/api/loyalty/admin/campaigns/campaign-1")
            .expect(200);
        await request(app)
            .patch("/api/loyalty/admin/campaigns/campaign-1")
            .send({ name: "Updated rewards" })
            .expect(200);
        await request(app)
            .delete("/api/loyalty/admin/campaigns/campaign-1")
            .expect(200);
        await request(app)
            .post("/api/loyalty/admin/campaigns/campaign-1/activate")
            .expect(200);
        await request(app)
            .post("/api/loyalty/admin/campaigns/campaign-1/end")
            .expect(200);
        await request(app)
            .post("/api/loyalty/admin/campaigns/campaign-1/archive")
            .expect(200);
        await request(app).get("/api/loyalty/admin/summary").expect(200);
        const crossTenant = await request(app)
            .get("/api/loyalty/admin/tenants")
            .expect(200);
        expect(crossTenant.body.data).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    tenantId: "tenant-disabled",
                    active: false,
                }),
            ]),
        );

        expect(setup.customer.executeList).toHaveBeenCalledWith(
            "tenant-1",
            "customer-1",
        );
        expect(setup.customer.executeCampaign).toHaveBeenCalledWith(
            "tenant-1",
            "campaign-1",
            "customer-1",
        );
        expect(setup.claim.executeCampaign).toHaveBeenCalledWith(
            "tenant-1",
            "campaign-1",
            "customer-1",
        );
        expect(setup.create.execute).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({
                reward: expect.objectContaining({ type: CouponType.PERCENT }),
            }),
        );
        expect(setup.update.execute).toHaveBeenCalledWith(
            "tenant-1",
            "campaign-1",
            expect.objectContaining({ name: "Updated rewards" }),
        );
        expect(setup.transition.deleteDraft).toHaveBeenCalledWith(
            "tenant-1",
            "campaign-1",
        );
        expect(setup.transition.execute.mock.calls.map((call) => call[2])).toEqual([
            "activate",
            "end",
            "archive",
        ]);
    });

    test("registers only campaign routes and applies tenant gates to tenant-scoped routes", () => {
        jest.clearAllMocks();
        const setup = controller();
        const app = { use: jest.fn() };
        loyaltyRoutes(app as unknown as Application, setup.instance);
        const router = app.use.mock.calls[0]![1] as Router;
        type RouteLayer = {
            route?: {
                path: string;
                methods: Record<string, boolean>;
                stack: Array<{ handle: unknown }>;
            };
        };
        const routeLayers = (router as unknown as { stack: RouteLayer[] }).stack.filter(
            (layer) => layer.route,
        );
        const routes = routeLayers.flatMap((layer) =>
            Object.entries(layer.route!.methods)
                .filter(([, enabled]) => enabled)
                .map(([method]) => `${method.toUpperCase()} ${layer.route!.path}`),
        );

        expect(routes).toEqual([
            "GET /me",
            "GET /me/campaigns/:campaignId",
            "POST /me/campaigns/:campaignId/claim",
            "GET /admin/summary",
            "GET /admin/campaigns",
            "POST /admin/campaigns",
            "GET /admin/campaigns/:campaignId",
            "PATCH /admin/campaigns/:campaignId",
            "DELETE /admin/campaigns/:campaignId",
            "POST /admin/campaigns/:campaignId/activate",
            "POST /admin/campaigns/:campaignId/end",
            "POST /admin/campaigns/:campaignId/archive",
            "GET /admin/tenants",
        ]);
        expect(routes).not.toEqual(
            expect.arrayContaining([
                expect.stringMatching(/\/admin\/config/),
                expect.stringMatching(/\/admin\/tenants\/:tenantId\/config/),
            ]),
        );

        const customerRoute = routeLayers.find(
            (layer) => layer.route?.path === "/me",
        )!.route!;
        expect(customerRoute.stack).toHaveLength(6);
        expect(customerRoute.stack[0]!.handle).toBe(authenticate);
        expect(customerRoute.stack[1]!.handle).toBe(
            requireConcreteTenantContext,
        );
        expect(
            (customerRoute.stack[2]!.handle as { name: string }).name,
        ).toBe("requireActiveTenant");
        expect(requireTenantType).toHaveBeenCalledWith(
            "STORE",
            "BOOKING",
            "HYBRID",
        );
        expect(requireTenantFeature).toHaveBeenCalledWith("LOYALTY");
        expect(requirePermission).toHaveBeenCalledWith("appointments:read");
        expect(requirePermission).toHaveBeenCalledWith("appointments:write");
    });

    test("requires a super administrator for the cross-tenant controller", async () => {
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

describe("loyalty campaign request DTO validation", () => {
    const dtoBuilders = [
        [
            "create",
            (data: Record<string, unknown>) =>
                plainToInstance(CreateLoyaltyCampaignDto, data),
        ],
        [
            "update",
            (data: Record<string, unknown>) =>
                plainToInstance(UpdateLoyaltyCampaignDto, data),
        ],
    ] as const;

    test.each(dtoBuilders)(
        "%s transforms a valid reward without modifying global Reflect",
        (_label, build) => {
            const reflect = Reflect as typeof Reflect & {
                getMetadata?: unknown;
            };
            const getMetadata = reflect.getMetadata;
            const dto = build({ reward: campaignRequest().reward });

            expect(dto.reward).toBeInstanceOf(LoyaltyRewardDefinitionDto);
            expect(reflect.getMetadata).toBe(getMetadata);
            expect(getMetadata).toBeUndefined();
        },
    );

    test.each(dtoBuilders)(
        "%s rejects invalid fields inside the nested reward",
        async (_label, build) => {
            const errors = await validate(
                build({ reward: { type: CouponType.PERCENT } }),
            );

            expect(errors).toEqual(
                expect.arrayContaining([
                    expect.objectContaining({
                        property: "reward",
                        children: expect.arrayContaining([
                            expect.objectContaining({ property: "value" }),
                        ]),
                    }),
                ]),
            );
        },
    );

    test.each(dtoBuilders)(
        "caps %s integer fields at the Prisma Int maximum",
        async (_label, build) => {
            const errors = await validate(
                build({
                    ...campaignRequest(),
                    rewardValidDays: MAX_LOYALTY_PRISMA_INT + 1,
                    maxClaims: MAX_LOYALTY_PRISMA_INT + 1,
                }),
            );

            expect(errors.map((error) => error.property)).toEqual(
                expect.arrayContaining(["rewardValidDays", "maxClaims"]),
            );
        },
    );
});
