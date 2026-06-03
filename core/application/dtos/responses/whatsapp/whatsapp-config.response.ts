export interface IWhatsAppConfigResponse {
    id: string;
    tenantId: string;
    phoneNumberId: string;
    businessAccountId: string;
    accessToken: string;
    webhookVerifyToken: string;
    enabled: boolean;
    notificationsEnabled: boolean;
    botEnabled: boolean;
    templates?: Record<string, any> | null;
    botConfig?: Record<string, any> | null;
    createdAt: Date;
    updatedAt: Date;
}

export class WhatsAppConfigResponse {
    static fromEntity(
        config: any,
        maskTokens: boolean = true,
    ): IWhatsAppConfigResponse {
        return {
            id: config.id,
            tenantId: config.tenantId,
            phoneNumberId: config.phoneNumberId,
            businessAccountId: config.businessAccountId,
            accessToken: maskTokens ? "********" : config.accessToken,
            webhookVerifyToken: maskTokens
                ? "********"
                : config.webhookVerifyToken,
            enabled: config.enabled,
            notificationsEnabled: config.notificationsEnabled,
            botEnabled: config.botEnabled,
            templates: config.templates ?? null,
            botConfig: config.botConfig ?? null,
            createdAt: config.createdAt,
            updatedAt: config.updatedAt,
        };
    }
}
