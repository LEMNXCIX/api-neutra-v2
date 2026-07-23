import { prisma } from "@/config/db.config";
import {
    ILogRepository,
    LogFilters,
    LogEntry,
    LogStats,
    LogCreateData,
} from "@/core/repositories/log.repository.interface";

jest.setTimeout(20000);

class NoOpLogRepository implements ILogRepository {
    async create(_log: LogCreateData): Promise<void> {}
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

jest.mock("@/infrastructure/database/prisma/log.prisma-repository", () => ({
    PrismaLogRepository: NoOpLogRepository,
}));

beforeAll(async () => {
    try {
        await prisma.$connect();
    } catch (err) {
        console.error("Test DB connection failed:", err);
    }
});

afterAll(async () => {
    try {
        const { RedisProvider } =
            await import("@/infrastructure/providers/redis.provider");
        const redis = RedisProvider.getInstance();
        await redis.quit();
    } catch {
        // Redis is mocked in test env, safe to ignore
    }

    try {
        await prisma.$disconnect();
    } catch (err) {
        console.error("Prisma disconnect error:", err);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
});
