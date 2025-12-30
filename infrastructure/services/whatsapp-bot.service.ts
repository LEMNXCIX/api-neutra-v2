import { IWhatsAppConversationRepository } from '@/core/repositories/whatsapp-conversation.repository.interface';
import { IWhatsAppMessageRepository } from '@/core/repositories/whatsapp-message.repository.interface';
import { WhatsAppService } from './whatsapp.service';
import logger from '@/helpers/logger.helpers';

export class WhatsAppBotService {

    constructor(
        private conversationRepository: IWhatsAppConversationRepository,
        private messageRepository: IWhatsAppMessageRepository,
        private whatsappService: WhatsAppService
    ) { }

    async processIncomingMessage(message: any, tenantId: string): Promise<void> {
        try {
            const from = message.from; // User's phone number
            const text = message.text?.body;
            const waMessageId = message.id;

            // 1. Save incoming message (if not already handled by webhook controller dispatch)
            // Ideally, the webhook controller or a use case calls this service.
            // We'll assume the message is already saved or mapped to a domain entity before getting here, 
            // or we handle raw payload. For this example, let's assume we get the raw payload.

            // 2. Get or Create Conversation
            let conversation = await this.conversationRepository.findByPhoneNumber(tenantId, from);

            if (!conversation) {
                conversation = await this.conversationRepository.create({
                    tenantId,
                    waConversationId: waMessageId, // Initial conversation ID often linked to first message or session
                    phoneNumber: from,
                    status: 'active',
                    lastMessageAt: new Date()
                });

                // Send Welcome Message
                await this.whatsappService.sendTextMessage(from, "¡Hola! Bienvenido a nuestro servicio automatizado.", tenantId);
            } else {
                // Update last message time
                // await this.conversationRepository.updateLastMessageAt(conversation.id, new Date());
            }

            // 3. Simple Echo/Menu Logic (Placeholder)
            if (text) {
                if (text.toLowerCase().includes('hola')) {
                    await this.whatsappService.sendTextMessage(from, "Hola de nuevo. ¿En qué puedo ayudarte hoy?", tenantId);
                } else {
                    // Default fallback
                    // await this.whatsappService.sendTextMessage(from, "Recibí tu mensaje: " + text, tenantId);
                }
            }

        } catch (error: any) {
            logger.error(`Error processing bot message: ${error.message}`);
        }
    }
}
