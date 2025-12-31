import { WhatsAppMessage } from "../entities/whatsapp-message.entity";

export interface IWhatsAppMessageRepository {
    create(message: Omit<WhatsAppMessage, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppMessage>;
    findById(id: string): Promise<WhatsAppMessage | null>;
    findByWaMessageId(waMessageId: string): Promise<WhatsAppMessage | null>;
    findByConversationId(conversationId: string): Promise<WhatsAppMessage[]>;
    updateStatus(waMessageId: string, status: string): Promise<void>;
}
