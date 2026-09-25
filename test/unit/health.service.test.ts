import { HealthService } from "@/infrastructure/services/health.service";

describe("HealthService", () => {
    it("reports ready when both dependency probes succeed", async () => {
        const service = new HealthService(
            jest.fn().mockResolvedValue([{ ready: 1 }]),
            jest.fn().mockResolvedValue("PONG"),
        );

        await expect(service.checkReadiness()).resolves.toEqual({
            ready: true,
            dependencies: { database: true, redis: true },
        });
    });

    it("reports unavailable without exposing probe errors", async () => {
        const service = new HealthService(
            jest.fn().mockRejectedValue(new Error("database secret")),
            jest.fn().mockRejectedValue(new Error("redis secret")),
        );

        await expect(service.checkReadiness()).resolves.toEqual({
            ready: false,
            dependencies: { database: false, redis: false },
        });
    });

    it("bounds a dependency probe that never settles", async () => {
        const never = new Promise<unknown>(() => undefined);
        const service = new HealthService(
            jest.fn().mockResolvedValue(undefined),
            jest.fn().mockReturnValue(never),
            5,
        );

        await expect(service.checkReadiness()).resolves.toEqual({
            ready: false,
            dependencies: { database: true, redis: false },
        });
    });
});
