import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { PrismaLogRepository } from '@/infrastructure/database/prisma/log.prisma-repository';
import { LogLevel } from '@/core/providers/logger.interface';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '@/infrastructure/context/request-context';
import { SECURITY_CONSTANTS } from '@/core/domain/constants';

const prisma = new PrismaClient();
const logRepository = new PrismaLogRepository(prisma);

export default function wideLogMiddleware(req: Request, res: Response, next: NextFunction) {
    const start = Date.now();
    const traceId = (req as any).traceId || uuidv4();
    (req as any).traceId = traceId;

    // Skip logging for admin logs to avoid recursion
    if (req.originalUrl.startsWith('/api/admin/logs')) {
        return next();
    }

    // Intercept response body
    const originalSend = res.send;
    let responseBody: any;

    res.send = function (body: any) {
        try {
            responseBody = JSON.parse(body);
        } catch {
            responseBody = body;
        }
        return originalSend.call(this, body);
    };

    // Capture original end for duration
    res.on('finish', () => {
        const duration = Date.now() - start;

        // Asynchronous logging (fire-and-forget)
        const logData = {
            level: res.statusCode >= 500 ? LogLevel.ERROR : res.statusCode >= 400 ? LogLevel.WARN : LogLevel.INFO,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration,
            tenantId: (req as any).tenantId || (req as any).tenant?.id,
            userId: (req as any).user?.id,
            ip: req.ip || req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress,
            userAgent: req.headers['user-agent'],
            message: `HTTP ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
            traceId,
            metadata: {
                query: req.query,
                params: req.params,
                // Avoid logging sensitive body data by default or use a sanitizer
                requestBody: sanitize(req.body),
                responseBody: sanitize(responseBody),
                headers: sanitizeHeaders(req.headers)
            },
            error: RequestContext.getError()
        };

        // Persist only to DB if it's an error or important enough
        // Or persist EVERYTHING if we want full observability as "Canonical Logs"
        logRepository.create(logData).catch(err => {
            console.error('Error in wideLogMiddleware persistence:', err);
        });
    });

    next();
}

function sanitize(body: any): any {
    if (!body || typeof body !== 'object') return body;
    const sanitized = { ...body };
    const sensitiveFields = SECURITY_CONSTANTS.SENSITIVE_FIELDS;

    for (const key of Object.keys(sanitized)) {
        if (sensitiveFields.some(field => key.toLowerCase() === field.toLowerCase())) {
            sanitized[key] = '[REDACTED]';
        }
    }
    return sanitized;
}

function sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveHeaders = SECURITY_CONSTANTS.SENSITIVE_HEADERS;

    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = '[REDACTED]';
        }
    }
    return sanitized;
}
