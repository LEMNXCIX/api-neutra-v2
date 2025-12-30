import { INotificationProvider, NotificationMessage } from '@/core/ports/notification-provider.interface';
import { SendNotificationUseCase } from '@/core/application/whatsapp/send-notification.use-case';
import { WhatsAppService } from '@/infrastructure/services/whatsapp.service';
import { WhatsAppConfigPrismaRepository } from '@/infrastructure/database/prisma/whatsapp-config.prisma-repository';
import { WhatsAppMessagePrismaRepository } from '@/infrastructure/database/prisma/whatsapp-message.prisma-repository';
import { PrismaClient } from '@prisma/client';
import logger from '@/helpers/logger.helpers';

// Manual DI for provider (single instance)
const prisma = new PrismaClient();
const configRepo = new WhatsAppConfigPrismaRepository(prisma);
const messageRepo = new WhatsAppMessagePrismaRepository(prisma);
const whatsappService = new WhatsAppService(configRepo, messageRepo);
const sendNotificationUseCase = new SendNotificationUseCase(whatsappService);

export class WhatsAppProvider implements INotificationProvider {

    async send(recipient: string, message: NotificationMessage, options?: any): Promise<boolean> {
        try {
            const tenantId = options?.tenantId;

            if (!tenantId) {
                logger.warn('[WhatsAppProvider] Missing tenantId in options. Cannot send WhatsApp message.');
                return false;
            }

            // Determine if it's a template message or free text
            // Meta API mostly requires templates for business initiated conversations (notifications).
            // We assume 'message.templateId' maps to a WhatsApp Template Name.
            // 'message.data' can contain the components.

            if (message.templateId) {
                // Template Message
                await sendNotificationUseCase.execute({
                    tenantId,
                    to: recipient,
                    templateName: message.templateId, // e.g. "appointment_confirmed"
                    languageCode: options?.language || 'es',
                    components: message.data?.components || [] // Format: [{type: 'body', parameters: [...]}]
                });
            } else {
                // Try sending text message (Might fail if 24h window is closed)
                await whatsappService.sendTextMessage(recipient, message.body, tenantId);
            }

            logger.info(`[WhatsAppProvider] WhatsApp message sent to ${recipient}`);
            return true;
        } catch (error: any) {
            logger.error(`[WhatsAppProvider] Error sending WhatsApp message: ${error.message}`);
            return false;
        }
    }

    getChannelName(): string {
        return 'WHATSAPP';
    }
}
