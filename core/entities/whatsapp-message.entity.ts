export interface WhatsAppMessage {
    id: string;
    tenantId: string;
    waMessageId: string;
    waConversationId?: string | null;
    from: string;
    to: string;
    type: string;
    content: any;
    status: string;
    direction: string;
    userId?: string | null;
    appointmentId?: string | null;
    orderId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
