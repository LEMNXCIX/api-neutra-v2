import express from "express";
import request from "supertest";
import type { IHealthService } from "@/core/ports/health-service.interface";
import { healthRoutes } from "@/infrastructure/routes/health.routes";
import { HealthController } from "@/interface-adapters/controllers/health.controller";

function testApp(service: IHealthService) {
    const app = express();
    healthRoutes(app, new HealthController(service));
    return app;
}

describe("health routes", () => {
    it("keeps liveness independent from dependency readiness", async () => {
        const service: IHealthService = {
            checkReadiness: jest.fn().mockRejectedValue(new Error("not used")),
        };

        await request(testApp(service))
            .get("/health")
            .expect(200)
            .expect({ status: "ok" });

        expect(service.checkReadiness).not.toHaveBeenCalled();
    });

    it("returns 503 when a dependency is unavailable", async () => {
        const service: IHealthService = {
            checkReadiness: jest.fn().mockResolvedValue({
                ready: false,
                dependencies: { database: true, redis: false },
            }),
        };

        const response = await request(testApp(service)).get("/ready");

        expect(response.status).toBe(503);
        expect(response.body).toEqual({
            status: "not_ready",
            dependencies: { database: true, redis: false },
        });
    });

    it("does not expose a dependency error", async () => {
        const service: IHealthService = {
            checkReadiness: jest
                .fn()
                .mockRejectedValue(new Error("redis-password")),
        };

        const response = await request(testApp(service)).get("/ready");

        expect(response.status).toBe(503);
        expect(JSON.stringify(response.body)).not.toContain("redis-password");
    });

    it("returns 200 when all dependencies are ready", async () => {
        const service: IHealthService = {
            checkReadiness: jest.fn().mockResolvedValue({
                ready: true,
                dependencies: { database: true, redis: true },
            }),
        };

        const response = await request(testApp(service)).get("/ready");

        expect(response.status).toBe(200);
        expect(response.body.status).toBe("ready");
        expect(response.body.dependencies).toEqual({
            database: true,
            redis: true,
        });
    });
});
