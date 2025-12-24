export interface NotificationMessage {
    subject?: string;
    body: string;
    templateId?: string;
    data?: any;
    attachments?: any[];
}

export interface INotificationProvider {
    send(recipient: string, message: NotificationMessage): Promise<boolean>;
    getChannelName(): string; // 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH'
}
