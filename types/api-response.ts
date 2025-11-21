import { v4 as uuidv4 } from 'uuid';

export interface ErrorDetail {
    code: string; // Machine readable error code (e.g., INVALID_EMAIL)
    message: string; // Human readable message
    field?: string; // Field that caused the error
    domain?: string; // Error category (e.g., auth, validation)
    metadata?: any; // Additional context
}

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly code: string;
    public readonly details?: ErrorDetail[];

    constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_SERVER_ERROR', details?: ErrorDetail[]) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export interface StandardResponse<T = any> {
    success: boolean;
    statusCode: number;
    message: string;
    data?: T;
    errors?: ErrorDetail[];
    meta: {
        traceId: string;
        timestamp: string;
        [key: string]: any;
    };
}

export class ApiResponse {
    static success<T>(data: T, message: string = 'OK', statusCode: number = 200, traceId?: string): StandardResponse<T> {
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

    static error(message: string, errors: ErrorDetail[] = [], statusCode: number = 500, traceId?: string): StandardResponse<null> {
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
