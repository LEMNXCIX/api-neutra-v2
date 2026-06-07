import { ILogRepository } from "@/core/repositories/log.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetLogStatsUseCase {
    constructor(private logRepository: ILogRepository) {}

    async execute(timeframe: string = "daily"): Promise<UseCaseResult> {
        const stats = await this.logRepository.getStats(timeframe);

        return Success(stats, "Log stats retrieved successfully");
    }
}
