import { Request, Response, NextFunction } from "express";
import {
    ApiResponse,
    StandardResponse,
    AppError,
    ErrorDetail,
    ResponsePagination,
    SystemErrorCodes,
} from "@/types/api-response";
import { LogLevel, logLevelForStatus } from "@/core/providers/logger.interface";
import type { ILogger } from "@/core/providers/logger.interface";
import config from "@/config/index.config";
import { isProduction } from "@/core/domain/constants";
import { DomainError } from "@/core/domain/errors/domain-errors";
import { httpStatusFromDomainError } from "@/types/error-codes";

const configIsProduction = isProduction(config.ENVIRONMENT);

/**
 * Already-wrapped envelope: the double-wrap guard below only proves the keys are
 * present, so this is exactly the view the log call and `res.json` pass through.
 */
type StandardResponseEnvelope = { meta: unknown; statusCode: number };

function isStandardResponseEnvelope(
    body: unknown,
): body is StandardResponseEnvelope {
    return (
        typeof body === "object" &&
        body !== null &&
        "meta" in body &&
        "statusCode" in body
    );
}

/**
 * Legacy service result: `{ success, code, message, data, pagination, errors }`.
 * This is the shape use cases return and the response middleware re-wraps.
 */
type ServiceResult = {
    success?: boolean;
    code?: number;
    message?: string;
    data?: unknown;
    pagination?: ResponsePagination;
    errors?: unknown;
    errorDetails?: unknown;
};

function isServiceResult(value: unknown): value is ServiceResult {
    return (
        typeof value === "object" &&
        value !== null &&
        ("success" in value || "code" in value)
    );
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** The `{ data: { success, code, ... } }` nesting some controllers return. */
function nestedServiceResult(body: unknown): ServiceResult | null {
    return isRecord(body) && isServiceResult(body.data) ? body.data : null;
}

function makeTraceId(req: Request) {
    return `${req.method}-${req.path}-${Date.now()}`;
}

export default function createResponseMiddleware(logger: ILogger) {
    return function responseMiddleware(
        req: Request,
        res: Response,
        next: NextFunction,
    ) {
    const traceId = req.traceId || makeTraceId(req);
    req.traceId = traceId;

    const originalJson = res.json.bind(res);

    res.json = function (body?: unknown) {
        // Avoid double wrapping if it's already a StandardResponse
        if (isStandardResponseEnvelope(body)) {
            logger.logResponse({ statusCode: body.statusCode, body });
            return originalJson(body);
        }

        // Transform legacy/service payloads to StandardResponse
        let statusCode = res.statusCode || 200;
        let message = "";
        let data = body;
        let errors: ErrorDetail[] | undefined = undefined;
        let success = statusCode >= 200 && statusCode < 300;

        let pagination: ResponsePagination | undefined = undefined;

        const serviceResult = isServiceResult(body) ? body : null;
        const nestedResult = serviceResult ? null : nestedServiceResult(body);

        // Check for legacy service result shape: { success, code, message, data, errors }
        if (serviceResult) {
            success = serviceResult.success ?? success;
            statusCode = serviceResult.code ?? statusCode;
            message = serviceResult.message ?? message;
            data = serviceResult.data;
            pagination = serviceResult.pagination; // Extract pagination

            if (serviceResult.errors || serviceResult.errorDetails) {
                errors = normalizeErrors(
                    serviceResult.errors || serviceResult.errorDetails,
                );
            }
        }
        // Check for nested data shape: { data: { success, code, ... } }
        else if (nestedResult) {
            success = nestedResult.success ?? success;
            statusCode = nestedResult.code ?? statusCode;
            message = nestedResult.message ?? message;
            data = nestedResult.data;
            pagination = nestedResult.pagination; // Extract pagination
            if (nestedResult.errors || nestedResult.errorDetails) {
                errors = normalizeErrors(
                    nestedResult.errors || nestedResult.errorDetails,
                );
            }
        }

        const response: StandardResponse<unknown> = {
            success,
            statusCode,
            message,
            data,
            errors,
            pagination,
            meta: {
                traceId,
                timestamp: new Date().toISOString(),
            },
        };

        // Sync HTTP status code
        if (res.statusCode !== statusCode) {
            res.status(statusCode);
        }

        // SAFETY: StandardResponse is a plain record-shaped response payload.
        logger.logResponse({
            statusCode,
            body: response as unknown as Record<string, unknown>,
        });

        return originalJson(response);
    };

    res.apiSuccess = function (
        data?: unknown,
        message: string = "OK",
        statusCode: number = 200,
    ) {
        const response = ApiResponse.success(
            data,
            message,
            statusCode,
            traceId,
        );
        // SAFETY: ApiResponse returns a plain record-shaped response payload.
        logger.logResponse({
            statusCode,
            body: response as unknown as Record<string, unknown>,
        });
        res.status(statusCode).json(response);
        return res;
    };

    res.apiError = function (
        err: unknown,
        message: string = "Error",
        statusCode: number = 500,
    ) {
        let finalMessage = message;
        let finalStatusCode = statusCode;
        let finalErrors: ErrorDetail[] = [];

        if (err instanceof DomainError) {
            finalMessage = err.message || message;
            finalStatusCode = httpStatusFromDomainError(err);
            finalErrors = [
                {
                    code: err.code,
                    message: err.message,
                },
            ];
        } else if (err instanceof AppError) {
            finalMessage = err.message || message;
            finalStatusCode = err.statusCode;
            finalErrors = err.details || [];
        } else if (err instanceof Error) {
            finalMessage = err.message || message;
            finalErrors = [
                {
                    code: SystemErrorCodes.INTERNAL_SERVER_ERROR,
                    message: err.message,
                    metadata: !configIsProduction
                        ? { stack: err.stack }
                        : undefined,
                },
            ];
        } else if (typeof err === "string") {
            finalErrors = [
                {
                    code: SystemErrorCodes.UNKNOWN_ERROR,
                    message: err,
                },
            ];
        } else if (Array.isArray(err)) {
            finalErrors = normalizeErrors(err);
        } else if (typeof err === "object") {
            finalErrors = normalizeErrors([err]);
        }

        const response = ApiResponse.error(
            finalMessage,
            finalErrors,
            finalStatusCode,
            traceId,
        );
        // The second argument of `error(message, error?, metadata?)` is the
        // caught exception: pino serialises it with its stack, and that field
        // means "an exception was thrown here". A validation failure has no
        // exception, so passing its details there logged the same array twice
        // (once as `response.errors`, once as `error`), carried no stack, and
        // made a routine client 400 look like a server fault to anything
        // counting error-level events that have an `error` field. The details
        // are already in `response` and stay queryable as
        // `response.errors[].code`.
        const thrown =
            err instanceof Error || typeof err === "string" ? err : undefined;
        // 4xx is the caller's problem and a warning; 5xx is ours and stays an
        // error, keeping the exception in the error slot so its stack survives.
        if (logLevelForStatus(finalStatusCode) === LogLevel.ERROR) {
            logger.error("API Error Response", thrown, { traceId, response });
        } else {
            // `warn` has no error slot, and it does not need one: the message
            // and the details are already inside `response`.
            logger.warn("API Error Response", { traceId, response });
        }
        res.status(finalStatusCode).json(response);
        return res;
    };

        next();
    };
}

function isErrorDetail(value: unknown): value is ErrorDetail {
    return typeof value === "object" && value !== null;
}

function normalizeErrors(errors: unknown): ErrorDetail[] {
    const list = Array.isArray(errors) ? errors : [errors];
    return list.map((e: unknown) => {
        if (typeof e === "string") {
            return { code: SystemErrorCodes.UNKNOWN_ERROR, message: e };
        }
        if (isErrorDetail(e)) {
            return {
                code: e.code || SystemErrorCodes.UNKNOWN_ERROR,
                message: e.message || "Unknown error",
                field: e.field,
                domain: e.domain,
                metadata: e.metadata,
            };
        }
        return { code: SystemErrorCodes.UNKNOWN_ERROR, message: String(e) };
    });
}
