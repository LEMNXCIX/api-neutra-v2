import { LogLevel } from "@/core/providers/logger.interface";

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
    metadata?: Record<string, unknown>;
    error?: Record<string, unknown>;
    traceId?: string;
}
