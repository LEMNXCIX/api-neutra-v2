export interface NotificationAttachment {
    filename: string;
    content: string | Buffer;
    contentType?: string;
}

export interface NotificationMessage {
    subject?: string;
    body: string;
    templateId?: string;
    data?: Record<string, unknown>;
    attachments?: NotificationAttachment[];
}

export interface INotificationProvider {
    send(
        recipient: string,
        message: NotificationMessage,
        options?: Record<string, unknown>,
    ): Promise<boolean>;
    getChannelName(): string;
}
