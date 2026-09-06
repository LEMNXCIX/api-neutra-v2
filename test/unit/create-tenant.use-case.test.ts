import { CreateTenantUseCase } from "@/core/application/tenant/create-tenant.use-case";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";
import { TenantType } from "@/core/entities/tenant.entity";

function setup(existingSlug?: unknown) {
    const tenantRepository = {
        findBySlug: jest.fn().mockResolvedValue(existingSlug ?? null),
        create: jest
            .fn()
            .mockImplementation(async (data) => ({ id: "t-new", ...data })),
    };
    const userRepository = { addTenant: jest.fn().mockResolvedValue(undefined) };
    const roleRepository = {
        createWithPermissions: jest
            .fn()
            .mockImplementation(async (_tid, data) => ({
                id: `role-${data.name}`,
                name: data.name,
                level: data.level,
                permissions: data.permissionIds,
            })),
    };
    const permissionRepository = {
        upsertByName: jest
            .fn()
            .mockImplementation(async (_tid, name, description) => ({
                id: `perm-${name}`,
                name,
                description,
            })),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn(),
        updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new CreateTenantUseCase(
        tenantRepository as never,
        userRepository as never,
        roleRepository as never,
        permissionRepository as never,
        featureRepository as never,
    );
    return {
        useCase,
        tenantRepository,
        userRepository,
        featureRepository,
        permissionRepository,
    };
}

const BASE = {
    name: "My Store",
    slug: "my-store",
    type: TenantType.STORE,
};

describe("CreateTenantUseCase", () => {
    test("syncs only enabled features to the tenantFeature table", async () => {
        const { useCase, featureRepository } = setup();

        await useCase.execute(
            {
                ...BASE,
                config: {
                    features: { COUPONS: true, BANNERS: false, SLIDES: true },
                },
            },
            "creator-1",
        );

        expect(featureRepository.updateTenantFeatures).toHaveBeenCalledWith(
            "t-new",
            { COUPONS: true, SLIDES: true },
        );
        expect(
            featureRepository.updateTenantFeatures.mock.calls[0][1],
        ).not.toHaveProperty("BANNERS");
    });

    test("does not sync when no features are selected", async () => {
        const { useCase, featureRepository } = setup();

        await useCase.execute({ ...BASE, config: { features: {} } }, "c1");

        expect(featureRepository.updateTenantFeatures).not.toHaveBeenCalled();
    });

    test("does not sync when config has no features key", async () => {
        const { useCase, featureRepository } = setup();

        await useCase.execute(BASE, "c1");
        expect(featureRepository.updateTenantFeatures).not.toHaveBeenCalled();
    });

    test("rejects duplicate slug before creating anything", async () => {
        const { useCase, tenantRepository } = setup({ id: "existing" });

        await expect(useCase.execute(BASE, "c1")).rejects.toThrow(
            DuplicateEntityError,
        );
        expect(tenantRepository.create).not.toHaveBeenCalled();
    });

    test("adds the creator as ADMIN member", async () => {
        const { useCase, userRepository } = setup();

        await useCase.execute(BASE, "creator-1");

        expect(userRepository.addTenant).toHaveBeenCalledWith(
            "creator-1",
            "t-new",
            "role-ADMIN",
        );
    });
});
