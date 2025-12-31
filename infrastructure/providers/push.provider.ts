import { INotificationProvider, NotificationMessage } from '@/core/ports/notification-provider.interface';

export class PushProvider implements INotificationProvider {
    async send(recipient: string, message: NotificationMessage, options?: any): Promise<boolean> {
        // Implementation with Firebase Cloud Messaging (FCM) would go here
        // recipient would be a device token
        console.log(`[PushProvider] Sending Push Notification to ${recipient}: ${message.body}`);

        // Simulate async API call
        // await firebaseAdmin.messaging().send(...)
        return Promise.resolve(true);
    }

    getChannelName(): string {
        return 'PUSH';
    }
}
