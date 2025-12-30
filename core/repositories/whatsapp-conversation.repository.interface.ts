import { WhatsAppConversation } from "../entities/whatsapp-conversation.entity";

export interface IWhatsAppConversationRepository {
    create(conversation: Omit<WhatsAppConversation, "id" | "createdAt" | "updatedAt">): Promise<WhatsAppConversation>;
    findByWaConversationId(waConversationId: string): Promise<WhatsAppConversation | null>;
    findByPhoneNumber(tenantId: string, phoneNumber: string): Promise<WhatsAppConversation | null>;
    updateContext(id: string, context: any): Promise<void>;
    updateStatus(id: string, status: string): Promise<void>;
}
