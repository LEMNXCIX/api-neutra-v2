import {
    ILogRepository,
    LogFilters,
    LogEntry,
    LogStats,
} from "@/core/repositories/log.repository.interface";
import { CreateLogDTO } from "@/core/application/dtos/requests/log.request";

class NoOpLogRepository implements ILogRepository {
    async create(_log: CreateLogDTO): Promise<void> {}
    async findAll(
        _filters: LogFilters,
    ): Promise<{ data: LogEntry[]; total: number }> {
        return { data: [], total: 0 };
    }
    async getStats(_timeframe: string): Promise<LogStats> {
        return {
            totalRequests: 0,
            errorCount: 0,
            errorRate: 0,
            statusDistribution: [],
            levelDistribution: [],
            performance: { avgDuration: null, maxDuration: null },
            topFailedEndpoints: [],
            dailyTrend: [],
        };
    }
}

module.exports = { PrismaLogRepository: NoOpLogRepository };
