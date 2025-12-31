import { PrismaClient } from '@prisma/client';
import { ILogRepository, CreateLogDTO } from '../../../core/repositories/log.repository.interface';
import { LogLevel } from '../../../core/providers/logger.interface';

export class PrismaLogRepository implements ILogRepository {
    private prisma: PrismaClient;

    constructor(prisma: PrismaClient) {
        this.prisma = prisma;
    }

    async create(log: CreateLogDTO): Promise<void> {
        try {
            // Convert domain LogLevel to Prisma LogLevel
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
                    metadata: log.metadata || {},
                    error: log.error || {},
                    traceId: log.traceId,
                    timestamp: new Date()
                }
            });
        } catch (error) {
            // Fail silently or log to console to avoid infinite loop if database is down
            console.error('Failed to persist log to database:', error);
        }
    }

    async findAll(filters: any): Promise<{ data: any[], total: number }> {
        const { level, tenantId, startDate, endDate, skip = 0, take = 50 } = filters;

        const where: any = {};
        if (level) where.level = level;
        if (tenantId) where.tenantId = tenantId;
        if (startDate || endDate) {
            where.timestamp = {};
            if (startDate) where.timestamp.gte = new Date(startDate);
            if (endDate) where.timestamp.lte = new Date(endDate);
        }

        const [data, total] = await Promise.all([
            this.prisma.log.findMany({
                where,
                skip: Number(skip),
                take: Number(take),
                orderBy: { timestamp: 'desc' }
            }),
            this.prisma.log.count({ where })
        ]);

        return { data, total };
    }

    async getStats(timeframe: string = 'last_7_days'): Promise<any> {
        const now = new Date();
        let startDate = new Date();

        if (timeframe === 'last_24h') {
            startDate.setHours(now.getHours() - 24);
        } else {
            startDate.setDate(now.getDate() - 7);
        }

        const where = {
            timestamp: {
                gte: startDate
            }
        };

        const [
            totalRequests,
            errorCount,
            statusDistribution,
            levelDistribution,
            performance,
            topFailedEndpoints
        ] = await Promise.all([
            this.prisma.log.count({ where }),
            this.prisma.log.count({ where: { ...where, statusCode: { gte: 500 } } }),
            this.prisma.log.groupBy({
                by: ['statusCode'],
                where,
                _count: { _all: true },
                orderBy: { _count: { statusCode: 'desc' } },
                take: 5
            }),
            this.prisma.log.groupBy({
                by: ['level'],
                where,
                _count: { _all: true }
            }),
            this.prisma.log.aggregate({
                where,
                _avg: { duration: true },
                _max: { duration: true }
            }),
            this.prisma.log.groupBy({
                by: ['url', 'method'],
                where: { ...where, statusCode: { gte: 500 } },
                _count: { _all: true },
                orderBy: { _count: { url: 'desc' } },
                take: 5
            })
        ]);

        // Daily trend (Errors vs Successes)
        // Note: For complex date grouping, raw query is often more efficient.
        // This is a simplified version grouping by day using raw SQL if possible, 
        // or a fallback to processing in JS if dataset is small.
        // Assuming PostgreSQL/SQLite syntax for now.
        const dailyTrendRaw: any[] = await this.prisma.$queryRaw`
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
            errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0,
            statusDistribution: statusDistribution.map((s: any) => ({ status: s.statusCode, count: s._count._all })),
            levelDistribution: levelDistribution.map((l: any) => ({ level: l.level, count: l._count._all })),
            performance: {
                avgDuration: performance._avg.duration || 0,
                maxDuration: performance._max.duration || 0
            },
            topFailedEndpoints: topFailedEndpoints.map((e: any) => ({
                url: e.url,
                method: e.method,
                count: e._count._all
            })),
            dailyTrend: (dailyTrendRaw || []).map((d: any) => ({
                date: d.date,
                total: Number(d.total),
                errors: Number(d.errors)
            }))
        };
    }

    private mapLogLevel(level: LogLevel): any {
        const map: Record<string, string> = {
            [LogLevel.DEBUG]: 'DEBUG',
            [LogLevel.INFO]: 'INFO',
            [LogLevel.WARN]: 'WARN',
            [LogLevel.ERROR]: 'ERROR'
        };
        return map[level] || 'INFO';
    }
}
