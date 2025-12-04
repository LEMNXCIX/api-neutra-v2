import { Request, Response, NextFunction } from 'express';
import { PinoLoggerProvider } from '@/infrastructure/providers/pino-logger.provider';

const logger = new PinoLoggerProvider();

export default function requestMiddleware(req: Request, res: Response, next: NextFunction) {
    logger.logRequest({
        method: req.method,
        url: req.originalUrl,
        body: req.body,
        headers: req.headers
    });
    next();
}
