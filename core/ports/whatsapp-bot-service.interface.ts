export interface IncomingWhatsAppMessage {
    from: string;
    /**
     * Meta's message id. Optional because the provider's webhook type allows
     * its absence, and a conversation cannot be correlated without it — the
     * consumer guards rather than assuming it.
     */
    id?: string;
    text?: { body: string };
    [key: string]: unknown;
}

export interface IWhatsAppBotService {
    processIncomingMessage(
        message: IncomingWhatsAppMessage,
        tenantId: string,
    ): Promise<void>;
}
