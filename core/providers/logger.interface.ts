export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}

export interface LogOptions {
    level?: LogLevel;
    includePayload?: boolean;
    includeResponse?: boolean;
    includeHeaders?: boolean;
    sanitize?: boolean; // Para remover datos sensibles
}

export interface ILogger {
    info(message: string, metadata?: any, options?: LogOptions): void;
    warn(message: string, metadata?: any, options?: LogOptions): void;
    error(message: string, error?: Error | unknown, metadata?: any): void;
    debug(message: string, metadata?: any, options?: LogOptions): void;

    // Métodos específicos para HTTP logging
    logRequest(req: { method: string; url: string; body?: any; headers?: any }): void;
    logResponse(res: { statusCode: number; body?: any; headers?: any }): void;
}
