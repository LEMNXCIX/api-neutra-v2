import { INotificationProvider, NotificationMessage } from '@/core/ports/notification-provider.interface';

export class WhatsAppProvider implements INotificationProvider {
    async send(recipient: string, message: NotificationMessage): Promise<boolean> {
        // Implementation with Twilio/Meta API would go here
        console.log(`[WhatsAppProvider] Sending WhatsApp to ${recipient}: ${message.body}`);

        // Simulate async API call
        // await twilioClient.messages.create(...)
        return Promise.resolve(true);
    }

    getChannelName(): string {
        return 'WHATSAPP';
    }
}
