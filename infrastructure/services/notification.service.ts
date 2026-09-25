import { NotificationService } from '@/core/services/notification.service';
import type { INotificationProvider } from '@/core/ports/notification-provider.interface';

/**
 * Notification service factory.
 * Channel providers are built and owned by the composition root, so importing
 * this module has no side effects.
 */
export function createNotificationService(
    providers: INotificationProvider[],
): NotificationService {
    return new NotificationService(providers);
}
