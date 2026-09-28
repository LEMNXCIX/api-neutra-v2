import type { IEmailService } from "@/core/ports/email.port";
import type { ILogger } from "@/core/providers/logger.interface";
import { NodemailerProvider } from "@/infrastructure/providers/nodemailer.provider";

/**
 * Email service factory.
 * Ownership lives in the composition root (see infrastructure/config/runtime.ts);
 * nothing here is instantiated at module load.
 */
export function createEmailService(logger: ILogger): IEmailService {
    return new NodemailerProvider(logger);
}
