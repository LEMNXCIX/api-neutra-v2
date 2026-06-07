export interface IncomingWhatsAppMessage {
    from: string;
    text?: { body: string };
    [key: string]: unknown;
}

export interface IWhatsAppBotService {
    processIncomingMessage(
        message: IncomingWhatsAppMessage,
        tenantId: string,
    ): Promise<void>;
}
