const mockFeatureRepository = {
    getTenantFeatureStatus: jest.fn(),
};

jest.mock("@/infrastructure/config/container", () => ({
    Container: {
        getFeatureRepository: () => mockFeatureRepository,
    },
}));

import { requireTenantFeature } from "@/middleware/tenant-feature.middleware";

describe("LOYALTY feature middleware", () => {
    beforeEach(() => {
        mockFeatureRepository.getTenantFeatureStatus.mockReset();
    });

    test("rejects a tenant when LOYALTY is disabled", async () => {
        mockFeatureRepository.getTenantFeatureStatus.mockResolvedValue({
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
        mockFeatureRepository.getTenantFeatureStatus.mockResolvedValue({
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
