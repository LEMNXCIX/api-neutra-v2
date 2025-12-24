import { INotificationProvider, NotificationMessage } from '@/core/ports/notification-provider.interface';
import { emailService } from '@/infrastructure/services/email.service';

export class EmailProvider implements INotificationProvider {
    async send(recipient: string, message: NotificationMessage): Promise<boolean> {
        try {
            // Use existing emailService
            // Mapping generic NotificationMessage to emailService parameters
            // If templateId is provided, use it, otherwise use a generic template or raw body is not directly supported by current interface?
            // Current emailService methods are specific (sendWelcomeEmail, sendAppointmentConfirmation, etc.)
            // But it also has sendEmail generic method.

            const subject = message.subject || 'Notification';
            const template = message.templateId || 'general-notification'; // Assuming a generic template exists or will be handled
            const data = message.data || { body: message.body };

            console.log(`[EmailProvider] Sending email to ${recipient} with subject: ${subject}`);

            return await emailService.sendEmail(
                recipient,
                subject,
                template,
                data,
                undefined, // tenantConfig - might need to be passed in message.data or handled globally
                message.attachments
            );
        } catch (error) {
            console.error('[EmailProvider] Error sending email:', error);
            return false;
        }
    }

    getChannelName(): string {
        return 'EMAIL';
    }
}
