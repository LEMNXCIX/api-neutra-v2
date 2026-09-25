import {
    INotificationProvider,
    NotificationMessage,
} from "@/core/ports/notification-provider.interface";
import { WhatsAppComponent, IWhatsAppService } from "@/core/ports/whatsapp-service.interface";
import { SendNotificationUseCase } from "@/core/application/whatsapp/send-notification.use-case";
import type { ILogger } from "@/core/providers/logger.interface";

export class WhatsAppProvider implements INotificationProvider {
    constructor(
        private readonly whatsappService: IWhatsAppService,
        private readonly sendNotificationUseCase: SendNotificationUseCase,
        private readonly logger: ILogger,
    ) {}

    async send(
        recipient: string,
        message: NotificationMessage,
        options?: any,
    ): Promise<boolean> {
        try {
            const tenantId = options?.tenantId;

            if (!tenantId) {
                this.logger.warn(
                    "[WhatsAppProvider] Missing tenantId in options. Cannot send WhatsApp message.",
                );
                return false;
            }

            // Determine if it's a template message or free text
            // Meta API mostly requires templates for business initiated conversations (notifications).
            // We assume 'message.templateId' maps to a WhatsApp Template Name.
            // 'message.data' can contain the components.

            if (message.templateId) {
                // Template Message
                await this.sendNotificationUseCase.execute({
                    tenantId,
                    to: recipient,
                    templateName: message.templateId, // e.g. "appointment_confirmed"
                    languageCode: options?.language || "es",
                    components:
                        (message.data?.components as WhatsAppComponent[]) || [],
                });
            } else {
                // Try sending text message (Might fail if 24h window is closed)
                await this.whatsappService.sendTextMessage(
                    recipient,
                    message.body,
                    tenantId,
                );
            }

            this.logger.info(
                `[WhatsAppProvider] WhatsApp message sent to ${recipient}`,
            );
            return true;
        } catch (error: unknown) {
            const msg = error instanceof Error ? error.message : String(error);
            this.logger.error(
                `[WhatsAppProvider] Error sending WhatsApp message: ${msg}`,
            );
            return false;
        }
    }

    getChannelName(): string {
        return "WHATSAPP";
    }
}
