import { IQueueProvider } from '@/core/providers/queue-provider.interface';
import { notificationQueue } from '@/infrastructure/services/queue.service';

export class BullMQQueueProvider implements IQueueProvider {
    async enqueue(queueName: string, data: any): Promise<void> {
        // For now we assume queueName is always 'notifications' as it's the only one we have
        // But we can adapt it if we add more queues
        await notificationQueue.add(queueName, data, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 1000
            },
            removeOnComplete: true,
            removeOnFail: false
        });
    }
}
