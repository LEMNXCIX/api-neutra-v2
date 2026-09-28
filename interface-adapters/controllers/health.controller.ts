import type { Request, Response } from "express";
import type {
    HealthReadiness,
    IHealthService,
} from "@/core/ports/health-service.interface";

const unavailable: HealthReadiness = {
    ready: false,
    dependencies: { database: false, redis: false },
};

export class HealthController {
    constructor(private readonly healthService: IHealthService) {}

    readonly health = (_req: Request, res: Response): Response => {
        return res.status(200).json({ status: "ok" });
    };

    readonly ready = async (
        _req: Request,
        res: Response,
    ): Promise<Response> => {
        let result: HealthReadiness;
        try {
            result = await this.healthService.checkReadiness();
        } catch {
            result = unavailable;
        }

        return res.status(result.ready ? 200 : 503).json({
            status: result.ready ? "ready" : "not_ready",
            dependencies: result.dependencies,
        });
    };
}
