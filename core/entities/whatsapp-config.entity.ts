export interface WhatsAppConfig {
    id: string;
    tenantId: string;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    enabled: boolean;
    notificationsEnabled: boolean;
    botEnabled: boolean;
    templates?: any;
    botConfig?: any;
    createdAt: Date;
    updatedAt: Date;
}
