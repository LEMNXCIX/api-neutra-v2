import { HealthController } from "@/interface-adapters/controllers/health.controller";
import { LogController } from "@/interface-adapters/controllers/log.controller";
import { GetLogsUseCase } from "@/core/application/log/get-logs.use-case";
import { GetLogStatsUseCase } from "@/core/application/log/get-log-stats.use-case";
import type { Runtime } from "../runtime";

export function createOperationsControllers(runtime: Runtime) {
    const r = runtime.repositories;

    return {
        health: new HealthController(runtime.healthService),
        log: new LogController(
            new GetLogsUseCase(r.log),
            new GetLogStatsUseCase(r.log),
        ),
    };
}
