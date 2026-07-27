import {
    Log as PrismaLog,
    Prisma,
    LogLevel as PrismaLogLevel,
} from "@prisma/client";
import { PrismaClient } from "@prisma/client";
import {
    ILogRepository,
    LogFilters,
    LogEntry,
    LogStats,
    LogCreateData,
} from "@/core/repositories/log.repository.interface";
import { LogLevel } from "@/core/providers/logger.interface";

export class PrismaLogRepository implements ILogRepository {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    private mapToEntity(data: PrismaLog): LogEntry {
        return {
            id: data.id,
            timestamp: data.timestamp,
            level: data.level,
            method: data.method,
            url: data.url,
            statusCode: data.statusCode,
            duration: data.duration,
            tenantId: data.tenantId,
            userId: data.userId,
            ip: data.ip,
            userAgent: data.userAgent,
            message: data.message,
            metadata: data.metadata as Record<string, unknown> | null,
            error: data.error as Record<string, unknown> | null,
            traceId: data.traceId,
        };
    }

    async create(log: LogCreateData): Promise<void> {
        try {
            const prismaLevel = this.mapLogLevel(log.level);

            await this.prisma.log.create({
                data: {
                    level: prismaLevel,
                    method: log.method,
                    url: log.url,
                    statusCode: log.statusCode,
                    duration: log.duration,
                    tenantId: log.tenantId,
                    userId: log.userId,
                    ip: log.ip,
                    userAgent: log.userAgent,
                    message: log.message,
                    metadata: (log.metadata ?? {}) as Prisma.InputJsonValue,
                    error: (log.error ?? {}) as Prisma.InputJsonValue,
                    traceId: log.traceId,
                    timestamp: new Date(),
                },
            });
        } catch (error) {
            console.error("Failed to persist log to database:", error);
        }
    }

    async findAll(
        filters: LogFilters,
    ): Promise<{ data: LogEntry[]; total: number }> {
        const {
            level,
            tenantId,
            startDate,
            endDate,
            skip = 0,
            take = 50,
        } = filters;

        const where: Prisma.LogWhereInput = {};
        if (level) where.level = level.toUpperCase() as PrismaLogLevel;
        if (tenantId) where.tenantId = tenantId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate)
                (where.timestamp as Prisma.DateTimeFilter).gte = new Date(
                    startDate,
                );
            if (endDate)
                (where.timestamp as Prisma.DateTimeFilter).lte = new Date(
                    endDate,
                );
        }

        const [data, total] = await Promise.all([
            this.prisma.log.findMany({
                where,
                skip: Number(skip),
                take: Number(take),
                orderBy: { timestamp: "desc" },
            }),
            this.prisma.log.count({ where }),
        ]);

        return { data: data.map(this.mapToEntity), total };
    }

    async getStats(timeframe: string = "last_7_days"): Promise<LogStats> {
        const now = new Date();
        let startDate = new Date();

        if (timeframe === "last_24h") {
            startDate.setHours(now.getHours() - 24);
        } else {
            startDate.setDate(now.getDate() - 7);
        }

        const where: Prisma.LogWhereInput = {
            timestamp: { gte: startDate },
        };

        const [
            totalRequests,
            errorCount,
            statusDistribution,
            levelDistribution,
            performance,
            topFailedEndpoints,
        ] = await Promise.all([
            this.prisma.log.count({ where }),
            this.prisma.log.count({
                where: { ...where, statusCode: { gte: 500 } },
            }),
            this.prisma.log.groupBy({
                by: ["statusCode"],
                where,
                _count: { _all: true },
                orderBy: { _count: { statusCode: "desc" } },
                take: 5,
            }),
            this.prisma.log.groupBy({
                by: ["level"],
                where,
                _count: { _all: true },
            }),
            this.prisma.log.aggregate({
                where,
                _avg: { duration: true },
                _max: { duration: true },
            }),
            this.prisma.log.groupBy({
                by: ["url", "method"],
                where: { ...where, statusCode: { gte: 500 } },
                _count: { _all: true },
                orderBy: { _count: { url: "desc" } },
                take: 5,
            }),
        ]);

        const dailyTrendRaw: { date: string; total: bigint; errors: bigint }[] =
            await this.prisma.$queryRaw`
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE "statusCode" >= 500) as errors
      FROM logs
      WHERE timestamp >= ${startDate}
      GROUP BY DATE(timestamp)
      ORDER BY date ASC
    `;

        return {
            totalRequests,
            errorCount,
            errorRate:
                totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
            statusDistribution: statusDistribution.map((s) => ({
                status: s.statusCode,
                count: s._count._all,
            })),
            levelDistribution: levelDistribution.map((l) => ({
                level: l.level,
                count: l._count._all,
            })),
            performance: {
                avgDuration: performance._avg.duration,
                maxDuration: performance._max.duration,
            },
            topFailedEndpoints: topFailedEndpoints.map((e) => ({
                url: e.url,
                method: e.method,
                count: e._count._all,
            })),
            dailyTrend: (dailyTrendRaw || []).map((d) => ({
                date: d.date,
                total: Number(d.total),
                errors: Number(d.errors),
            })),
        };
    }

    private mapLogLevel(level: LogLevel): PrismaLogLevel {
        const map: Record<string, PrismaLogLevel> = {
            [LogLevel.DEBUG]: PrismaLogLevel.DEBUG,
            [LogLevel.INFO]: PrismaLogLevel.INFO,
            [LogLevel.WARN]: PrismaLogLevel.WARN,
            [LogLevel.ERROR]: PrismaLogLevel.ERROR,
        };
        return map[level] || PrismaLogLevel.INFO;
    }
}
