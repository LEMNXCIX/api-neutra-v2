export interface WhatsAppConversation {
    id: string;
    tenantId: string;
    waConversationId: string;
    phoneNumber: string;
    userId?: string | null;
    status: string;
    context?: any;
    lastMessageAt: Date;
    createdAt: Date;
    updatedAt: Date;
}
