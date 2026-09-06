import { ConfigureWhatsAppUseCase } from "@/core/application/whatsapp/configure-whatsapp.use-case";
import {
    ForbiddenError,
    ValidationError,
} from "@/core/domain/errors/domain-errors";

function setup(opts?: { features?: Record<string, boolean>; existing?: unknown }) {
    const featureRepository = {
        getTenantFeatureStatus: jest
            .fn()
            .mockResolvedValue(opts?.features ?? { WHATSAPP_API: true }),
        updateTenantFeatures: jest.fn(),
    };
    const whatsappConfigRepository = {
        findByTenantId: jest
            .fn()
            .mockResolvedValue(opts?.existing ?? null),
        create: jest.fn().mockImplementation(async (data) => data),
        update: jest.fn().mockImplementation(async (_tid, data) => data),
    };
    const useCase = new ConfigureWhatsAppUseCase(
        whatsappConfigRepository as never,
        featureRepository as never,
    );
    return { useCase, featureRepository, whatsappConfigRepository };
}

const FULL_CONFIG = {
    phoneNumberId: "pn-1",
    businessAccountId: "ba-1",
    accessToken: "token-123",
};

describe("ConfigureWhatsAppUseCase", () => {
    test("403 when the WHATSAPP_API feature is not enabled", async () => {
        const { useCase, whatsappConfigRepository } = setup({
            features: {},
        });

        await expect(
            useCase.execute("t1", FULL_CONFIG),
        ).rejects.toThrow(ForbiddenError);
        expect(
            whatsappConfigRepository.findByTenantId,
        ).not.toHaveBeenCalled();
    });

    test("creates config when none exists and credentials are complete", async () => {
        const { useCase, whatsappConfigRepository } = setup();

        const result = await useCase.execute("t1", {
            ...FULL_CONFIG,
            enabled: true,
        });

        expect(whatsappConfigRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                tenantId: "t1",
                phoneNumberId: "pn-1",
                enabled: true,
            }),
        );
        expect(result.success).toBe(true);
    });

    test("updates without requiring full credentials when config exists", async () => {
        const { useCase, whatsappConfigRepository } = setup({
            existing: { tenantId: "t1", phoneNumberId: "pn-old" },
        });

        const result = await useCase.execute("t1", { enabled: false });

        expect(whatsappConfigRepository.update).toHaveBeenCalled();
        expect(whatsappConfigRepository.create).not.toHaveBeenCalled();
        expect(result.success).toBe(true);
    });

    test("ValidationError on creation with missing credentials", async () => {
        const { useCase } = setup();

        await expect(
            useCase.execute("t1", { phoneNumberId: "pn-1" }),
        ).rejects.toThrow(ValidationError);
    });

    test("ValidationError without tenantId", async () => {
        const { useCase } = setup();

        await expect(useCase.execute("", FULL_CONFIG)).rejects.toThrow(
            ValidationError,
        );
    });
});
