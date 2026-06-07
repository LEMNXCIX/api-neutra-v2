export interface WhatsAppTemplate {
    name: string;
    language: string;
}

export interface BotConfig {
    welcomeMessage?: string;
    awayMessage?: string;
    businessHours?: { start: string; end: string };
}

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
    templates?: WhatsAppTemplate[];
    botConfig?: BotConfig;
    createdAt: Date;
    updatedAt: Date;
}
