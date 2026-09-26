jest.mock("@/config/db.config", () => ({ prisma: {} }));

import { PrismaLoyaltyRepository } from "@/infrastructure/database/prisma/loyalty.prisma-repository";
import { CreateTenantUseCase } from "@/core/application/tenant/create-tenant.use-case";
import { UpdateTenantUseCase } from "@/core/application/tenant/update-tenant.use-case";
import { UpdateTenantFeaturesUseCase } from "@/core/application/tenant/update-tenant-features.use-case";
import {
    assertTenantFeatureDependencies,
} from "@/core/domain/feature/feature.policy";
import { TenantType } from "@/core/entities/tenant.entity";
import {
    BusinessErrorCodes,
} from "@/types/error-codes";

function createUseCase() {
    const tenantRepository = {
        findBySlug: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async (data) => ({
            id: "tenant-1",
            ...data,
        })),
    };
    const userRepository = { addTenant: jest.fn().mockResolvedValue(undefined) };
    const roleRepository = {
        createWithPermissions: jest.fn().mockImplementation(async (_id, data) => ({
            id: `role-${data.name}`,
            ...data,
        })),
    };
    const permissionRepository = {
        upsertByName: jest.fn().mockImplementation(async (_id, name) => ({
            id: `permission-${name}`,
            name,
        })),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn(),
        updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
    };

    return {
        useCase: new CreateTenantUseCase(
            tenantRepository as never,
            userRepository as never,
            roleRepository as never,
            permissionRepository as never,
            featureRepository as never,
        ),
        tenantRepository,
        featureRepository,
    };
}

function updateUseCase(
    currentFeatures: Record<string, boolean>,
    hasLiveLoyaltyObligations = false,
) {
    const existing = {
        id: "tenant-1",
        name: "Tenant",
        slug: "tenant",
        type: TenantType.STORE,
        config: { features: currentFeatures },
    };
    const tenantRepository = {
        findById: jest.fn().mockResolvedValue(existing),
        findBySlug: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(async (_id, data) => ({
            ...existing,
            ...data,
        })),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue(currentFeatures),
        updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
    };
    const loyaltyRepository = {
        hasLiveLoyaltyObligations: jest
            .fn()
            .mockResolvedValue(hasLiveLoyaltyObligations),
    };
    const useCase = new UpdateTenantUseCase(
        tenantRepository as never,
        featureRepository as never,
        loyaltyRepository as never,
    );

    return {
        useCase,
        tenantRepository,
        featureRepository,
        loyaltyRepository,
    };
}

function updateFeaturesUseCase(
    currentFeatures: Record<string, boolean>,
    hasLiveLoyaltyObligations = false,
) {
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue(currentFeatures),
        updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
    };
    const loyaltyRepository = {
        hasLiveLoyaltyObligations: jest
            .fn()
            .mockResolvedValue(hasLiveLoyaltyObligations),
    };
    const useCase = new UpdateTenantFeaturesUseCase(
        featureRepository as never,
        loyaltyRepository as never,
    );

    return { useCase, featureRepository, loyaltyRepository };
}

describe("tenant feature dependency policy", () => {
    test("accepts simultaneous disable and rejects loyalty without coupons", () => {
        expect(() =>
            assertTenantFeatureDependencies({
                LOYALTY: false,
                COUPONS: false,
            }),
        ).not.toThrow();
        expect(() =>
            assertTenantFeatureDependencies({
                LOYALTY: true,
                COUPONS: false,
            }),
        ).toThrow("LOYALTY requires COUPONS to be enabled");
        expect(() =>
            assertTenantFeatureDependencies({ LOYALTY: true }),
        ).toThrow("LOYALTY requires COUPONS to be enabled");
    });

    test("create rejects an invalid feature set before creating a tenant", async () => {
        const { useCase, tenantRepository } = createUseCase();

        await expect(
            useCase.execute(
                {
                    name: "Tenant",
                    slug: "tenant",
                    type: TenantType.STORE,
                    config: { features: { LOYALTY: true } },
                },
                "creator-1",
            ),
        ).rejects.toMatchObject({ code: BusinessErrorCodes.LOYALTY_REQUIRES_COUPONS });
        expect(tenantRepository.create).not.toHaveBeenCalled();
    });

    test("create allows a tenant with a valid loyalty and coupons selection", async () => {
        const { useCase, tenantRepository } = createUseCase();

        await expect(
            useCase.execute(
                {
                    name: "Tenant",
                    slug: "tenant",
                    type: TenantType.STORE,
                    config: {
                        features: { LOYALTY: true, COUPONS: true },
                    },
                },
                "creator-1",
            ),
        ).resolves.toEqual(expect.objectContaining({ success: true }));
        expect(tenantRepository.create).toHaveBeenCalled();
    });

    test("update validates the TenantFeature-backed merged set before writes", async () => {
        const { useCase, tenantRepository, featureRepository } = updateUseCase({
            LOYALTY: false,
            COUPONS: true,
        });

        await expect(
            useCase.execute("tenant-1", {
                config: { features: { LOYALTY: true, COUPONS: false } },
            }),
        ).rejects.toMatchObject({ code: BusinessErrorCodes.LOYALTY_REQUIRES_COUPONS });
        expect(tenantRepository.update).not.toHaveBeenCalled();
        expect(
            featureRepository.updateTenantFeatures,
        ).not.toHaveBeenCalled();
    });

    test("update blocks disabling a dependency while obligations remain", async () => {
        const { useCase, tenantRepository, loyaltyRepository } = updateUseCase(
            { LOYALTY: true, COUPONS: true },
            true,
        );

        await expect(
            useCase.execute("tenant-1", {
                config: { features: { LOYALTY: false } },
            }),
        ).rejects.toMatchObject({ code: BusinessErrorCodes.LOYALTY_OBLIGATIONS_EXIST });
        expect(loyaltyRepository.hasLiveLoyaltyObligations).toHaveBeenCalledWith(
            "tenant-1",
        );
        expect(tenantRepository.update).not.toHaveBeenCalled();
    });

    test("uses TenantFeature status as the canonical feature merge", async () => {
        const tenantRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "tenant-1",
                name: "Tenant",
                slug: "tenant",
                type: TenantType.STORE,
                config: {
                    features: { LOYALTY: true, COUPONS: false },
                },
            }),
            findBySlug: jest.fn().mockResolvedValue(null),
            update: jest.fn().mockImplementation(async (_id, data) => data),
        };
        const featureRepository = {
            getTenantFeatureStatus: jest.fn().mockResolvedValue({}),
            updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
        };
        const loyaltyRepository = {
            hasLiveLoyaltyObligations: jest.fn().mockResolvedValue(false),
        };
        const useCase = new UpdateTenantUseCase(
            tenantRepository as never,
            featureRepository as never,
            loyaltyRepository as never,
        );

        await useCase.execute("tenant-1", {
            config: { features: { SLIDES: true } },
        });

        expect(tenantRepository.update).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({
                config: expect.objectContaining({
                    features: { SLIDES: true },
                }),
            }),
        );
    });

    test("update allows enabling both dependent features together", async () => {
        const { useCase, tenantRepository, featureRepository } = updateUseCase({
            LOYALTY: false,
            COUPONS: false,
        });

        await useCase.execute("tenant-1", {
            config: { features: { LOYALTY: true, COUPONS: true } },
        });

        expect(tenantRepository.update).toHaveBeenCalled();
        expect(featureRepository.updateTenantFeatures).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({ LOYALTY: true, COUPONS: true }),
        );
    });

    test.each(["LOYALTY", "COUPONS"] as const)(
        "blocks disabling %s while live loyalty obligations remain",
        async (feature) => {
            const currentFeatures =
                feature === "LOYALTY"
                    ? { LOYALTY: true, COUPONS: true }
                    : { LOYALTY: false, COUPONS: true };
            const { useCase, featureRepository, loyaltyRepository } =
                updateFeaturesUseCase(currentFeatures, true);

            await expect(
                useCase.execute("tenant-1", {
                    features: { [feature]: false },
                }),
            ).rejects.toMatchObject({ code: BusinessErrorCodes.LOYALTY_OBLIGATIONS_EXIST });
            expect(loyaltyRepository.hasLiveLoyaltyObligations).toHaveBeenCalledWith(
                "tenant-1",
            );
            expect(
                featureRepository.updateTenantFeatures,
            ).not.toHaveBeenCalled();
        },
    );

    test("allows disabling both features together when no obligations remain", async () => {
        const { useCase, featureRepository, loyaltyRepository } =
            updateFeaturesUseCase({ LOYALTY: true, COUPONS: true }, false);

        await useCase.execute("tenant-1", {
            features: { LOYALTY: false, COUPONS: false },
        });

        expect(loyaltyRepository.hasLiveLoyaltyObligations).toHaveBeenCalledWith(
            "tenant-1",
        );
        expect(featureRepository.updateTenantFeatures).toHaveBeenCalledWith(
            "tenant-1",
            { LOYALTY: false, COUPONS: false },
        );
    });
});

describe("PrismaLoyaltyRepository.hasLiveLoyaltyObligations", () => {
    function setup() {
        const campaigns = {
            findFirst: jest.fn().mockResolvedValue(null),
        };
        const coupons = {
            findFirst: jest.fn().mockResolvedValue(null),
        };
        const database = { loyaltyCampaign: campaigns, coupon: coupons };
        return {
            repository: new PrismaLoyaltyRepository(database as never),
            campaigns,
            coupons,
        };
    }

    test("queries all ACTIVE campaigns and ENDED campaigns through claimUntil", async () => {
        const { repository, campaigns, coupons } = setup();
        campaigns.findFirst.mockResolvedValue({ id: "campaign-1" } as never);

        await expect(
            repository.hasLiveLoyaltyObligations("tenant-1"),
        ).resolves.toBe(true);

        expect(campaigns.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({
                tenantId: "tenant-1",
                status: { in: ["ACTIVE", "ENDED"] },
                OR: expect.arrayContaining([
                    { status: "ACTIVE" },
                    {
                        status: "ENDED",
                        claimUntil: { gt: expect.any(Date) },
                    },
                ]),
            }),
        });
        expect(coupons.findFirst).toHaveBeenCalledWith({
            where: expect.objectContaining({
                tenantId: "tenant-1",
                ownerId: { not: null },
                isReward: true,
                isLoyaltyTemplate: false,
                active: true,
                usageCount: 0,
                expiresAt: { gt: expect.any(Date) },
            }),
        });
    });

    test("treats a scheduled future ACTIVE campaign as live", async () => {
        const { repository, campaigns } = setup();
        campaigns.findFirst.mockResolvedValue({ id: "future-active" } as never);

        await expect(
            repository.hasLiveLoyaltyObligations("tenant-1"),
        ).resolves.toBe(true);

        const where = campaigns.findFirst.mock.calls[0][0].where;
        expect(where.OR).toContainEqual({ status: "ACTIVE" });
        expect(where.OR[0]).not.toHaveProperty("startsAt");
        expect(where.OR[0]).not.toHaveProperty("endsAt");
    });

    test("does not treat an ENDED campaign after claimUntil as live", async () => {
        const { repository, campaigns } = setup();

        await expect(
            repository.hasLiveLoyaltyObligations("tenant-1"),
        ).resolves.toBe(false);

        const where = campaigns.findFirst.mock.calls[0][0].where;
        const endedCondition = where.OR.find(
            (condition: { status: string }) => condition.status === "ENDED",
        );
        expect(endedCondition).toEqual({
            status: "ENDED",
            claimUntil: { gt: expect.any(Date) },
        });
    });

    test("checks unused active personal reward coupons independently", async () => {
        const { repository, campaigns, coupons } = setup();
        coupons.findFirst.mockResolvedValue({ id: "coupon-1" } as never);

        await expect(
            repository.hasLiveLoyaltyObligations("tenant-1"),
        ).resolves.toBe(true);
        expect(campaigns.findFirst).toHaveBeenCalled();
        expect(coupons.findFirst).toHaveBeenCalled();
    });

    test("returns false when no live campaign or unused reward exists", async () => {
        const { repository } = setup();

        await expect(
            repository.hasLiveLoyaltyObligations("tenant-1"),
        ).resolves.toBe(false);
    });
});
