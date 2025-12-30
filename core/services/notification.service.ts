import { INotificationProvider, NotificationMessage } from '@/core/ports/notification-provider.interface';

export class NotificationService {
    private providers: Map<string, INotificationProvider>;

    constructor(providers: INotificationProvider[]) {
        this.providers = new Map();
        providers.forEach(p => this.registerProvider(p));
    }

    private registerProvider(provider: INotificationProvider) {
        this.providers.set(provider.getChannelName(), provider);
    }

    /**
     * Notify a user on their preferred channels
     * @param channels List of channels to send to (e.g. ['EMAIL', 'WHATSAPP'])
     * @param recipientMap Map of channel -> recipient address/token (e.g. { EMAIL: 'user@example.com', WHATSAPP: '+1234567890' })
     * @param message The notification content
     */
    async notify(
        channels: string[],
        recipientMap: Record<string, string>,
        message: NotificationMessage,
        options?: any
    ): Promise<void> {

        const promises = channels.map(channel => {
            const provider = this.providers.get(channel);
            const recipient = recipientMap[channel];

            if (provider && recipient) {
                return provider.send(recipient, message, options);
            } else {
                console.warn(`[NotificationService] Skipping channel ${channel}: Provider not found or no recipient provided.`);
                return Promise.resolve(false);
            }
        });

        await Promise.all(promises);
    }
}
