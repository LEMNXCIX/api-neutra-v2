import type { NextFunction, Request, Response } from "express";
import config from "@/config/index.config";
import { isProduction } from "@/core/domain/constants";
import { DomainError } from "@/core/domain/errors/domain-errors";
import type { ILogger } from "@/core/providers/logger.interface";
import { LogLevel, logLevelForStatus } from "@/core/providers/logger.interface";
import { ApiResponse, AppError, type ErrorDetail } from "@/types/api-response";
import {
    getHttpStatusFromErrorCode,
    httpStatusFromDomainError,
    SystemErrorCodes,
} from "@/types/error-codes";

const showStack = !isProduction(config.ENVIRONMENT);

export const createErrorMiddleware =
    (logger: ILogger) =>
    (err: unknown, req: Request, res: Response, _next: NextFunction) => {
        const traceId = req.traceId;

        let statusCode = 500;
        let message = "An unexpected error occurred";
        let errors: ErrorDetail[] = [];

        if (err instanceof DomainError) {
            statusCode = httpStatusFromDomainError(err);
            message = err.message;
            errors = [
                {
                    code: err.code,
                    message: err.message,
                },
            ];
        } else if (err instanceof AppError) {
            statusCode = getHttpStatusFromErrorCode(err.code);
            message = err.message;
            errors = err.details || [
                {
                    code: err.code || SystemErrorCodes.INTERNAL_SERVER_ERROR,
                    message: err.message,
                },
            ];
        } else if (err instanceof Error) {
            // Never leak internal error messages (Prisma, libraries) to clients
            // in production; the real message is logged with the traceId.
            message = showStack ? err.message : "An unexpected error occurred";
            errors = [
                {
                    code: SystemErrorCodes.INTERNAL_SERVER_ERROR,
                    message,
                    metadata: showStack ? { stack: err.stack } : undefined,
                },
            ];
        } else if (typeof err === "string") {
            message = err;
            errors = [
                {
                    code: SystemErrorCodes.UNKNOWN_ERROR,
                    message: err,
                },
            ];
        }

        // Same cut as res.apiError: a 4xx is the caller's problem, a 5xx is ours.
        // An error this code does not recognise becomes a 500 above, so it lands
        // here as ERROR with `err` in the error slot and its stack intact, which is
        // the case that has to stay loud.
        if (logLevelForStatus(statusCode) === LogLevel.ERROR) {
            logger.error("Error handled by global middleware", err, {
                traceId,
                statusCode,
            });
        } else {
            logger.warn("Error handled by global middleware", {
                traceId,
                statusCode,
            });
        }

        const response = ApiResponse.error(
            message,
            errors,
            statusCode,
            traceId,
        );
        return res.status(statusCode).json(response);
    };
