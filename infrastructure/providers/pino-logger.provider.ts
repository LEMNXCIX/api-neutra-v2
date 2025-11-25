import { ILogger } from '@/core/providers/logger.interface';
import logger from '@/helpers/logger.helpers';

export class PinoLoggerProvider implements ILogger {
    info(message: string, meta?: any): void {
        if (meta) {
            logger.info({ message, ...meta });
        } else {
            logger.info(message);
        }
    }

    warn(message: string, meta?: any): void {
        if (meta) {
            logger.warn({ message, ...meta });
        } else {
            logger.warn(message);
        }
    }

    error(message: string, meta?: any): void {
        if (meta) {
            logger.error({ message, ...meta });
        } else {
            logger.error(message);
        }
    }
}
