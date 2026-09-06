import { UpdateTenantUseCase } from "@/core/application/tenant/update-tenant.use-case";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

function setup(existingTenant?: unknown) {
    const tenantRepository = {
        findById: jest.fn().mockResolvedValue(existingTenant ?? null),
        findBySlug: jest.fn().mockResolvedValue(null),
        update: jest.fn().mockImplementation(async (_id, data) => data),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn(),
        updateTenantFeatures: jest.fn().mockResolvedValue(undefined),
    };
    const useCase = new UpdateTenantUseCase(
        tenantRepository as never,
        featureRepository as never,
    );
    return { useCase, tenantRepository, featureRepository };
}

const EXISTING = {
    id: "t1",
    name: "Store",
    slug: "store",
    type: "STORE",
    config: {
        features: { COUPONS: true },
        branding: { primaryColor: "#000000" },
        settings: { currency: "USD" },
    },
};

describe("UpdateTenantUseCase", () => {
    test("syncs merged config.features to the tenantFeature table", async () => {
        const { useCase, featureRepository } = setup(EXISTING);

        await useCase.execute("t1", {
            config: { features: { COUPONS: true, SLIDES: true } },
        });

        expect(featureRepository.updateTenantFeatures).toHaveBeenCalledWith(
            "t1",
            expect.objectContaining({ COUPONS: true, SLIDES: true }),
        );
    });

    test("merges branding without wiping settings", async () => {
        const { useCase, tenantRepository } = setup(EXISTING);

        await useCase.execute("t1", {
            config: { branding: { primaryColor: "#7c3aed" } },
        });

        const saved = tenantRepository.update.mock.calls[0][1].config;
        expect(saved.branding.primaryColor).toBe("#7c3aed");
        expect(saved.settings.currency).toBe("USD");
        expect(saved.features.COUPONS).toBe(true);
    });

    test("does not sync when there are no features at all", async () => {
        const { useCase, featureRepository } = setup({
            ...EXISTING,
            config: {},
        });

        await useCase.execute("t1", { name: "Renamed" });

        expect(featureRepository.updateTenantFeatures).not.toHaveBeenCalled();
    });

    test("throws EntityNotFoundError for unknown tenant", async () => {
        const { useCase } = setup(null);
        await expect(useCase.execute("nope", { name: "X" })).rejects.toThrow(
            EntityNotFoundError,
        );
    });

    test("throws DuplicateEntityError when new slug is taken", async () => {
        const { useCase, tenantRepository } = setup(EXISTING);
        tenantRepository.findBySlug.mockResolvedValue({ id: "other" });

        await expect(
            useCase.execute("t1", { slug: "taken" }),
        ).rejects.toThrow(DuplicateEntityError);
    });

    test("allows keeping the same slug", async () => {
        const { useCase, tenantRepository } = setup(EXISTING);
        tenantRepository.findBySlug.mockResolvedValue(EXISTING);

        await expect(
            useCase.execute("t1", { slug: "store" }),
        ).resolves.toBeDefined();
    });
});
