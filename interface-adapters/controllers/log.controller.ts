import type { Request, Response } from "express";
import type {
    LogListQueryDto,
    SimpleQueryDto,
} from "@/core/application/dtos/requests/list-query.dto";
import type { GetLogStatsUseCase } from "@/core/application/log/get-log-stats.use-case";
import type { GetLogsUseCase } from "@/core/application/log/get-logs.use-case";

export class LogController {
    constructor(
        private getLogsUseCase: GetLogsUseCase,
        private getLogStatsUseCase: GetLogStatsUseCase,
    ) {}

    async getAll(req: Request, res: Response) {
        const query = (req.validatedQuery ?? {}) as LogListQueryDto;

        const result = await this.getLogsUseCase.execute({
            level: query.level,
            tenantId: query.tenantId,
            startDate: query.startDate,
            endDate: query.endDate,
            skip: query.skip,
            take: query.take,
        });

        return res.json(result);
    }

    async getStats(req: Request, res: Response) {
        const { timeframe } = (req.validatedQuery ?? {}) as SimpleQueryDto;

        const result = await this.getLogStatsUseCase.execute(
            timeframe || "daily",
        );

        return res.json(result);
    }
}
