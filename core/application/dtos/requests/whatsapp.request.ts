import {
    WhatsAppTemplate,
    BotConfig,
} from "@/core/entities/whatsapp-config.entity";

export interface ConfigureWhatsAppDTO {
    phoneNumberId?: string;
    businessAccountId?: string;
    accessToken?: string;
    webhookVerifyToken?: string;
    enabled?: boolean;
    notificationsEnabled?: boolean;
    botEnabled?: boolean;
    templates?: WhatsAppTemplate[];
    botConfig?: BotConfig;
}

export interface SendNotificationDTO {
    tenantId: string;
    to: string;
    templateName: string;
    languageCode?: string;
    components?: Array<{
        type: string;
        parameters?: Array<Record<string, unknown>>;
    }>;
}
