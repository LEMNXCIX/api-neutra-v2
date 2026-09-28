import type { IncomingHttpHeaders } from "node:http";
import type { NextFunction, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { SECURITY_CONSTANTS } from "@/core/domain/constants";
import type { ILogger } from "@/core/providers/logger.interface";
import { LogLevel } from "@/core/providers/logger.interface";
import type { ILogRepository } from "@/core/repositories/log.repository.interface";
import { RequestContext } from "@/infrastructure/context/request-context";

export default function wideLogMiddleware(
    logRepository: ILogRepository,
    logger: ILogger,
) {
    return (req: Request, res: Response, next: NextFunction) => {
        const start = Date.now();
        const traceId = req.traceId || uuidv4();
        req.traceId = traceId;

        // Skip logging for admin logs to avoid recursion
        if (req.originalUrl.startsWith("/api/admin/logs")) {
            return next();
        }

        // Intercept response body
        const originalSend = res.send;
        let responseBody: unknown;

        res.send = function (body?: unknown) {
            try {
                // Only a string body is JSON text; anything else is stored as-is
                // (parsing it would throw and land in the catch below anyway).
                responseBody =
                    typeof body === "string" ? JSON.parse(body) : body;
            } catch {
                responseBody = body;
            }
            return originalSend.call(this, body);
        };

        // Capture original end for duration
        res.on("finish", () => {
            const duration = Date.now() - start;

            // Asynchronous logging (fire-and-forget)
            const logData = {
                level:
                    res.statusCode >= 500
                        ? LogLevel.ERROR
                        : res.statusCode >= 400
                          ? LogLevel.WARN
                          : LogLevel.INFO,
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                duration,
                tenantId: req.tenantId || req.tenant?.id,
                userId: req.user?.id,
                ip:
                    req.ip ||
                    req.headers["x-forwarded-for"]?.toString() ||
                    req.socket.remoteAddress,
                userAgent: req.headers["user-agent"],
                message: `HTTP ${req.method} ${req.originalUrl} - ${res.statusCode} (${duration}ms)`,
                traceId,
                metadata: {
                    query: req.query,
                    params: req.params,
                    // Avoid logging sensitive body data by default or use a sanitizer
                    requestBody: sanitize(req.body),
                    responseBody: sanitize(responseBody),
                    headers: sanitizeHeaders(req.headers),
                },
                error: RequestContext.getError(),
            };

            // Persist only to DB if it's an error or important enough
            // Or persist EVERYTHING if we want full observability as "Canonical Logs"
            logRepository.create(logData).catch((err) => {
                logger.error("wideLogMiddleware persistence failed", err);
            });
        });

        next();
    };
}

/** JSON scalars, plus `undefined` for an absent body. */
type LogScalar = string | number | boolean | null | undefined;

/**
 * What a redacted payload can be: a masked record (arrays included, as they
 * were spread into an object before), or the scalar it arrived as.
 */
type SanitizedBody = Record<string, unknown> | LogScalar;

function isObjectLike(value: unknown): value is object {
    return typeof value === "object" && value !== null;
}

function isLogScalar(value: unknown): value is LogScalar {
    return (
        value === undefined ||
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    );
}

function sanitize(body: unknown): SanitizedBody {
    // Non-objects are logged exactly as they arrived. Values that are not JSON
    // at all (functions, symbols) have nothing to persist, so they are dropped.
    if (!isObjectLike(body)) {
        return isLogScalar(body) ? body : undefined;
    }
    const sanitized: Record<string, unknown> = { ...body };
    const sensitiveFields = SECURITY_CONSTANTS.SENSITIVE_FIELDS;

    for (const key of Object.keys(sanitized)) {
        if (
            sensitiveFields.some(
                (field) => key.toLowerCase() === field.toLowerCase(),
            )
        ) {
            sanitized[key] = "[REDACTED]";
        }
    }
    return sanitized;
}

function sanitizeHeaders(
    headers: IncomingHttpHeaders,
): Record<string, string | string[] | undefined> {
    const sanitized: Record<string, string | string[] | undefined> = {
        ...headers,
    };
    const sensitiveHeaders = SECURITY_CONSTANTS.SENSITIVE_HEADERS;

    for (const header of sensitiveHeaders) {
        if (sanitized[header]) {
            sanitized[header] = "[REDACTED]";
        }
    }
    return sanitized;
}
