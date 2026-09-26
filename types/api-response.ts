import { v4 as uuidv4 } from "uuid";

/** Pagination block carried by every paginated standard response. */
export interface ResponsePagination {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface ErrorDetail {
    code: string; // Machine readable error code (e.g., AUTH_INVALID_CREDENTIALS)
    message: string; // Human readable message
    field?: string; // Field that caused the error
    domain?: string; // Error category (e.g., auth, validation)
    /**
     * Opaque additional context. It is serialized straight to the client and
     * never inspected by the server, so it is `unknown`: readers must narrow it
     * first. It was `any`, which silently disabled checking for every consumer.
     */
    metadata?: unknown;
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: ErrorDetail[];

    constructor(
        message: string,
        statusCode: number = 500,
        code: string = "SYSTEM_INTERNAL_ERROR",
        details?: ErrorDetail[],
    ) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export interface StandardResponse<T> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    errors?: ErrorDetail[];
    pagination?: ResponsePagination;
    // No index signature: the envelope meta block is exactly traceId + timestamp.
    // The previous one had an `any` value type, which made every read off `meta`
    // unchecked for every consumer of the response envelope.
    meta: {
        traceId: string;
        timestamp: string;
    };
}

export class ApiResponse {
    static success<T>(
        data: T,
        message: string = "OK",
        statusCode: number = 200,
        traceId?: string,
    ): StandardResponse<T> {
        return {
            success: true,
            statusCode,
            message,
            data,
            meta: {
                traceId: traceId || uuidv4(),
                timestamp: new Date().toISOString(),
            },
        };
    }

    static error(
        message: string,
        errors: ErrorDetail[] = [],
        statusCode: number = 500,
        traceId?: string,
    ): StandardResponse<null> {
        return {
            success: false,
            statusCode,
            message,
            errors,
            meta: {
                traceId: traceId || uuidv4(),
                timestamp: new Date().toISOString(),
            },
        };
    }
}

/**
 * Helper to create a standardized error detail
 */
export function createErrorDetail(
    code: string,
    message: string,
    field?: string,
    metadata?: unknown,
): ErrorDetail {
    return {
        code,
        message,
        field,
        metadata,
    };
}

// Re-export error codes for convenience
export * from "@/types/error-codes";
