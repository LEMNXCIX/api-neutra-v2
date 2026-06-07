import { CreateLogDTO } from "@/core/application/dtos/requests/log.request";

export interface LogFilters {
    level?: string;
    tenantId?: string;
    startDate?: string;
    endDate?: string;
    skip?: string | number;
    take?: string | number;
}

export interface LogEntry {
    id: string;
    timestamp: Date;
    level: string;
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    tenantId: string | null;
    userId: string | null;
    ip: string | null;
    userAgent: string | null;
    message: string;
    metadata: Record<string, unknown> | null;
    error: Record<string, unknown> | null;
    traceId: string | null;
}

export interface LogStats {
    totalRequests: number;
    errorCount: number;
    errorRate: number;
    statusDistribution: { status: number; count: number }[];
    levelDistribution: { level: string; count: number }[];
    performance: {
        avgDuration: number | null;
        maxDuration: number | null;
    };
    topFailedEndpoints: { url: string; method: string; count: number }[];
    dailyTrend: { date: string; total: number; errors: number }[];
}

export interface ILogRepository {
    create(log: CreateLogDTO): Promise<void>;
    findAll(filters: LogFilters): Promise<{ data: LogEntry[]; total: number }>;
    getStats(timeframe: string): Promise<LogStats>;
}
