import { Request, Response } from "express";
import { GetLogsUseCase } from "@/core/application/log/get-logs.use-case";
import { GetLogStatsUseCase } from "@/core/application/log/get-log-stats.use-case";

export class LogController {
    constructor(
        private getLogsUseCase: GetLogsUseCase,
        private getLogStatsUseCase: GetLogStatsUseCase,
    ) {}

    async getAll(req: Request, res: Response) {
        const { level, tenantId, startDate, endDate, skip, take } = req.query;

        const result = await this.getLogsUseCase.execute({
            level: level as string,
            tenantId: tenantId as string,
            startDate: startDate as string,
            endDate: endDate as string,
            skip: skip as string,
            take: take as string,
        });

        return res.json(result);
    }

    async getStats(req: Request, res: Response) {
        const { timeframe } = req.query;

        const result = await this.getLogStatsUseCase.execute(
            (timeframe as string) || "daily",
        );

        return res.json(result);
    }
}
