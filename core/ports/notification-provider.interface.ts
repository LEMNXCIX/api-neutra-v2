export interface NotificationMessage {
    subject?: string;
    body: string;
    templateId?: string;
    data?: any;
    attachments?: any[];
}

export interface INotificationProvider {
    send(recipient: string, message: NotificationMessage, options?: any): Promise<boolean>;
    getChannelName(): string; // 'EMAIL', 'WHATSAPP', 'SMS', 'PUSH'
}
