export enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

export interface LogOptions {
    level?: LogLevel;
    includePayload?: boolean;
    includeResponse?: boolean;
    includeHeaders?: boolean;
    sanitize?: boolean; // Para remover datos sensibles
}

export interface ILogger {
    info(
        message: string,
        metadata?: Record<string, unknown>,
        options?: LogOptions,
    ): void;
    warn(
        message: string,
        metadata?: Record<string, unknown>,
        options?: LogOptions,
    ): void;
    error(
        message: string,
        error?: Error | unknown,
        metadata?: Record<string, unknown>,
    ): void;
    debug(
        message: string,
        metadata?: Record<string, unknown>,
        options?: LogOptions,
    ): void;

    logRequest(req: {
        method: string;
        url: string;
        body?: Record<string, unknown>;
        headers?: Record<string, string>;
    }): void;
    logResponse(res: {
        statusCode: number;
        body?: Record<string, unknown>;
        headers?: Record<string, string>;
    }): void;
}
