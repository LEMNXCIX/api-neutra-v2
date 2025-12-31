import { NotificationService } from '@/core/services/notification.service';
import { EmailProvider } from '@/infrastructure/providers/email.notification.provider';
import { WhatsAppProvider } from '@/infrastructure/providers/whatsapp.provider';
import { PushProvider } from '@/infrastructure/providers/push.provider';

/**
 * Notification Service Singleton (Infrastructure Layer)
 * Initializes the domain service with concrete infrastructure providers.
 */
class NotificationServiceSingleton {
    private static instance: NotificationService | null = null;

    private constructor() { }

    public static getInstance(): NotificationService {
        if (!NotificationServiceSingleton.instance) {
            NotificationServiceSingleton.instance = new NotificationService([
                new EmailProvider(),
                new WhatsAppProvider(),
                new PushProvider()
            ]);
        }
        return NotificationServiceSingleton.instance;
    }
}

export const notificationService = NotificationServiceSingleton.getInstance();
