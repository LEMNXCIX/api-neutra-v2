import { NodemailerProvider } from '@/infrastructure/providers/nodemailer.provider';
import { IEmailService } from '@/core/ports/email.port';
import type { ILogger } from '@/core/providers/logger.interface';

/**
 * Email service factory.
 * Ownership lives in the composition root (see infrastructure/config/runtime.ts);
 * nothing here is instantiated at module load.
 */
export function createEmailService(logger: ILogger): IEmailService {
    return new NodemailerProvider(logger);
}
