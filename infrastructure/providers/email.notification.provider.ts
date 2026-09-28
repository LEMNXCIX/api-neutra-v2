import type { IEmailService } from "@/core/ports/email.port";
import type {
    INotificationProvider,
    NotificationMessage,
} from "@/core/ports/notification-provider.interface";
import type { ILogger } from "@/core/providers/logger.interface";

export class EmailProvider implements INotificationProvider {
    constructor(
        private readonly emailService: IEmailService,
        private readonly logger: ILogger,
    ) {}

    async send(
        recipient: string,
        message: NotificationMessage,
        options?: Record<string, unknown>,
    ): Promise<boolean> {
        try {
            // Use the runtime-owned email service.
            // Mapping generic NotificationMessage to emailService parameters.
            // The email port exposes a generic sendEmail, so the template id is
            // forwarded as-is and `data` carries the template payload.

            const subject = message.subject || "Notification";
            const template = message.templateId || "general-notification";
            const data = message.data || { body: message.body };

            this.logger.info("Sending email", { recipient, subject });

            return await this.emailService.sendEmail(
                recipient,
                subject,
                template,
                data,
                undefined, // tenantConfig - might need to be passed in message.data or handled globally
                message.attachments,
            );
        } catch (error) {
            this.logger.error("Error sending email", error);
            return false;
        }
    }

    getChannelName(): string {
        return "EMAIL";
    }
}
