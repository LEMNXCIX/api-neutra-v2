export type WhatsAppMessageType =
    | "text"
    | "image"
    | "document"
    | "audio"
    | "video"
    | "template"
    | "interactive"
    | "location"
    | "sticker"
    | "contacts";
export type WhatsAppMessageStatus =
    | "sent"
    | "delivered"
    | "read"
    | "failed"
    | "pending";
export type WhatsAppMessageDirection = "inbound" | "outbound";

export interface WhatsAppMessageContent {
    text?: string;
    body?: string;
    mediaUrl?: string;
    mimeType?: string;
    caption?: string;
    templateName?: string;
    templateLanguage?: string;
    templateParams?: string[];
    components?: Record<string, unknown>[];
    interactiveType?: "button" | "list";
    interactiveData?: Record<string, unknown>;
}

export interface WhatsAppMessage {
    id: string;
    tenantId: string;
    waMessageId: string;
    waConversationId?: string | null;
    from: string;
    to: string;
    type: WhatsAppMessageType;
    content: WhatsAppMessageContent;
    status: WhatsAppMessageStatus;
    direction: WhatsAppMessageDirection;
    userId?: string | null;
    appointmentId?: string | null;
    orderId?: string | null;
    createdAt: Date;
    updatedAt: Date;
}
