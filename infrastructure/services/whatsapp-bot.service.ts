import type {
    IncomingWhatsAppMessage,
    IWhatsAppBotService,
} from "@/core/ports/whatsapp-bot-service.interface";
import type { ILogger } from "@/core/providers/logger.interface";
import type { IWhatsAppConversationRepository } from "@/core/repositories/whatsapp-conversation.repository.interface";
import type { IWhatsAppMessageRepository } from "@/core/repositories/whatsapp-message.repository.interface";
import type { WhatsAppService } from "./whatsapp.service";

export class WhatsAppBotService implements IWhatsAppBotService {
    constructor(
        private conversationRepository: IWhatsAppConversationRepository,
        private messageRepository: IWhatsAppMessageRepository,
        private whatsappService: WhatsAppService,
        private readonly logger: ILogger,
    ) {}

    async processIncomingMessage(
        message: IncomingWhatsAppMessage,
        tenantId: string,
    ): Promise<void> {
        try {
            const from = message.from; // User's phone number
            const text = message.text?.body;

            // 1. Save incoming message (if not already handled by webhook controller dispatch)
            // Ideally, the webhook controller or a use case calls this service.
            // We'll assume the message is already saved or mapped to a domain entity before getting here,
            // or we handle raw payload. For this example, let's assume we get the raw payload.

            // 2. Get or Create Conversation
            let conversation =
                await this.conversationRepository.findByPhoneNumber(
                    tenantId,
                    from,
                );

            if (!conversation) {
                // A conversation is keyed by Meta's message id, and the provider
                // allows that id to be absent. Creating one without it stored
                // `undefined` in a non-nullable column, and the conversation
                // could never be correlated again. Refuse instead, and say why.
                if (!message.id) {
                    this.logger.warn(
                        `Discarding WhatsApp message with no provider id from ${from}: the conversation cannot be correlated`,
                    );
                    return;
                }

                conversation = await this.conversationRepository.create({
                    tenantId,
                    waConversationId: message.id,
                    phoneNumber: from,
                    status: "active",
                    lastMessageAt: new Date(),
                });

                // Send Welcome Message
                await this.whatsappService.sendTextMessage(
                    from,
                    "¡Hola! Bienvenido a nuestro servicio automatizado.",
                    tenantId,
                );
            } else {
                // Update last message time
                // await this.conversationRepository.updateLastMessageAt(conversation.id, new Date());
            }

            // 3. Simple Echo/Menu Logic (Placeholder)
            if (text) {
                if (text.toLowerCase().includes("hola")) {
                    await this.whatsappService.sendTextMessage(
                        from,
                        "Hola de nuevo. ¿En qué puedo ayudarte hoy?",
                        tenantId,
                    );
                } else {
                    // Default fallback
                    // await this.whatsappService.sendTextMessage(from, "Recibí tu mensaje: " + text, tenantId);
                }
            }
        } catch (error) {
            const detail =
                error instanceof Error ? error.message : String(error);
            this.logger.error(`Error processing bot message: ${detail}`);
        }
    }
}
