export enum LogLevel {
    DEBUG = "debug",
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
}

/**
 * The level a failed HTTP response is logged at.
 *
 * A 4xx is the caller's problem and the expected answer to a malformed or
 * unauthorised request, so it is a warning. A 5xx is ours, and stays an error.
 * The cut is the one that matters for alerting: a dashboard counting
 * error-level events has to be able to trust that everything in it is a fault
 * on this side. Before this rule existed, a client sending a six-character
 * password raised the same ERROR line as an unmapped exception that carried a
 * stack trace, and the two were indistinguishable by level.
 *
 * An error the code did not recognise becomes a 500 in
 * httpStatusFromDomainError, so it lands here as ERROR and keeps its stack,
 * which is the behaviour that rule is there to preserve.
 */
export function logLevelForStatus(statusCode: number): LogLevel {
    return statusCode >= 500 ? LogLevel.ERROR : LogLevel.WARN;
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
