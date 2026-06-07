export interface WhatsAppComponent {
    type: string;
    parameters?: Array<Record<string, unknown>>;
}

export interface IWhatsAppService {
    sendTextMessage(
        to: string,
        message: string,
        tenantId: string,
    ): Promise<string>;
    sendTemplateMessage(
        to: string,
        templateName: string,
        languageCode: string,
        components: WhatsAppComponent[],
        tenantId: string,
    ): Promise<string>;
}
