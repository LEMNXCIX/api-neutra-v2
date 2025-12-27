import { ILogger, LogLevel, LogOptions } from '@/core/providers/logger.interface';
import logger from '@/helpers/logger.helpers'; // Existing Pino wrapper
import config from '@/config/index.config';

export class PinoLoggerProvider implements ILogger {
    private readonly logPayloads: boolean;
    private readonly logResponses: boolean;
    private readonly logHeaders: boolean;
    private readonly logLevel: LogLevel;

    constructor() {
        // Configuración desde variables de entorno
        this.logPayloads = process.env.LOG_PAYLOADS === 'true';
        this.logResponses = process.env.LOG_RESPONSES === 'true';
        this.logHeaders = process.env.LOG_HEADERS === 'true';
        this.logLevel = (process.env.LOG_LEVEL as LogLevel) || LogLevel.INFO;
    }

    info(message: string, metadata?: any, options?: LogOptions): void {
        const shouldLog = this.shouldLogMetadata(options);
        const sanitizedMetadata = shouldLog ? this.sanitize(metadata, options) : undefined;
        // Pino accepts (obj, msg) or (msg)
        if (sanitizedMetadata) {
            logger.info({ msg: message, ...sanitizedMetadata });
        } else {
            logger.info(message);
        }
    }

    warn(message: string, metadata?: any, options?: LogOptions): void {
        const shouldLog = this.shouldLogMetadata(options);
        const sanitizedMetadata = shouldLog ? this.sanitize(metadata, options) : undefined;
        if (sanitizedMetadata) {
            logger.warn({ msg: message, ...sanitizedMetadata });
        } else {
            logger.warn(message);
        }
    }

    error(message: string, error?: Error | unknown, metadata?: any): void {
        let finalError = error;
        let finalMetadata = metadata;

        // If the second argument is an object but not an instance of Error, 
        // and metadata is undefined, treat the second argument as metadata.
        if (error && !(error instanceof Error) && typeof error === 'object' && metadata === undefined) {
            finalMetadata = error;
            finalError = undefined;
        }

        const errorObj = finalError instanceof Error
            ? { message: finalError.message, stack: finalError.stack, name: finalError.name }
            : finalError !== undefined
                ? (typeof finalError === 'object' && finalError !== null ? this.sanitize(finalError) : { message: String(finalError) })
                : undefined;

        const logPayload: any = { msg: message };
        if (errorObj) logPayload.error = errorObj;
        if (finalMetadata) Object.assign(logPayload, this.sanitize(finalMetadata));

        logger.error(logPayload);
    }

    debug(message: string, metadata?: any, options?: LogOptions): void {
        // Pino wrapper in helpers might not expose debug, checking...
        // The helper only exports info, warn, error. We might need to extend it or use pino instance directly if possible.
        // For now, mapping debug to info if level is debug, or ignoring.
        // Actually, let's assume we can use info for debug if we want to see it, or we need to update the helper.
        // Given the helper limitation, I'll map debug to info but only if LOG_LEVEL is debug.
        if (this.logLevel === LogLevel.DEBUG) {
            const shouldLog = this.shouldLogMetadata(options);
            const sanitizedMetadata = shouldLog ? this.sanitize(metadata, options) : undefined;
            if (sanitizedMetadata) {
                logger.info({ level: 'DEBUG', msg: message, ...sanitizedMetadata });
            } else {
                logger.info({ level: 'DEBUG', msg: message });
            }
        }
    }

    logRequest(req: { method: string; url: string; body?: any; headers?: any }): void {
        const metadata: any = {
            method: req.method,
            url: req.url
        };

        if (this.logPayloads && req.body) {
            metadata.body = this.sanitize(req.body);
        }

        if (this.logHeaders && req.headers) {
            metadata.headers = this.sanitizeHeaders(req.headers);
        }

        this.info('HTTP Request', metadata);
    }

    logResponse(res: { statusCode: number; body?: any; headers?: any }): void {
        const metadata: any = {
            statusCode: res.statusCode
        };

        // For error responses (4xx, 5xx), extract error message if available
        if (res.statusCode >= 400 && res.body) {
            try {
                const body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
                if (body.errors && Array.isArray(body.errors) && body.errors.length > 0) {
                    metadata.message = body.errors[0].message;

                    // Si también hay un body.message, lo concatenamos
                    if (body.message) {
                        metadata.message += ` | ${body.message}`;
                        // O alternativamente: metadata.message = `${body.errors[0].message} - ${body.message}`;
                    }
                } else if (body.message) {
                    metadata.message = body.message;
                }
            } catch (e) {
                // Ignore parsing errors
            }
        }

        if (this.logResponses && res.body) {
            metadata.body = this.sanitize(res.body);
        }

        if (this.logHeaders && res.headers) {
            metadata.headers = res.headers;
        }

        this.info('HTTP Response', metadata);
    }

    private shouldLogMetadata(options?: LogOptions): boolean {
        if (options?.includePayload !== undefined) return options.includePayload;
        // Default behavior: log metadata if provided, unless it's a payload/response controlled by env vars
        // But here 'metadata' is generic.
        return true;
    }

    private sanitize(data: any, options?: LogOptions): any {
        if (!data) return data;
        if (options?.sanitize === false) return data;

        // Clonar para no mutar el original
        let cloned;
        try {
            cloned = JSON.parse(JSON.stringify(data));
        } catch (e) {
            return data; // Fallback if circular or not serializable
        }

        // Lista de campos sensibles a remover
        const sensitiveFields = ['password', 'token', 'accessToken', 'refreshToken', 'secret', 'apiKey', 'creditCard', 'cvv'];

        const sanitizeObject = (obj: any): any => {
            if (typeof obj !== 'object' || obj === null) return obj;

            if (Array.isArray(obj)) {
                return obj.map(item => sanitizeObject(item));
            }

            for (const key in obj) {
                if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
                    obj[key] = '[REDACTED]';
                } else if (typeof obj[key] === 'object') {
                    obj[key] = sanitizeObject(obj[key]);
                }
            }
            return obj;
        };

        return sanitizeObject(cloned);
    }

    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        // Remover headers sensibles
        const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
        sensitiveHeaders.forEach(header => {
            // Case insensitive check for headers
            const key = Object.keys(sanitized).find(k => k.toLowerCase() === header);
            if (key) {
                sanitized[key] = '[REDACTED]';
            }
        });
        return sanitized;
    }
}
