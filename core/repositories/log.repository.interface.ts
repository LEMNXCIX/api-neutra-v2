import { LogLevel } from '../providers/logger.interface';

export interface CreateLogDTO {
    level: LogLevel;
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    tenantId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    message: string;
    metadata?: any;
    error?: any;
    traceId?: string;
}

export interface ILogRepository {
    create(log: CreateLogDTO): Promise<void>;
    findAll(filters: any): Promise<{ data: any[], total: number }>;
    getStats(timeframe: string): Promise<any>;
}
