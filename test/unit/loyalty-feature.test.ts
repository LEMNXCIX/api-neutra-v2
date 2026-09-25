import { createRequireTenantFeature } from "@/middleware/tenant-feature.middleware";
import type { IFeatureRepository } from "@/core/repositories/feature.repository.interface";

const getFeatureStatus = jest.fn();
const mockFeatureRepository = {
    getTenantFeatureStatus: getFeatureStatus,
} as unknown as IFeatureRepository;
const requireTenantFeature = createRequireTenantFeature({
    featureRepository: mockFeatureRepository,
});

describe("LOYALTY feature middleware", () => {
    beforeEach(() => {
        getFeatureStatus.mockReset();
    });

    test("rejects a tenant when LOYALTY is disabled", async () => {
        getFeatureStatus.mockResolvedValue({
            LOYALTY: false,
        });
        const middleware = requireTenantFeature("LOYALTY");
        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        const next = jest.fn();

        await middleware(
            {
                tenantId: "tenant-1",
                user: { role: { name: "USER" } },
            } as never,
            response as never,
            next,
        );

        expect(response.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    test("continues when LOYALTY is enabled", async () => {
        getFeatureStatus.mockResolvedValue({
            LOYALTY: true,
        });
        const middleware = requireTenantFeature("LOYALTY");
        const response = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        const next = jest.fn();

        await middleware(
            {
                tenantId: "tenant-1",
                user: { role: { name: "USER" } },
            } as never,
            response as never,
            next,
        );

        expect(next).toHaveBeenCalledWith();
    });
});
