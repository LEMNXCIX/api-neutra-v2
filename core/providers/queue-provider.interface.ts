export interface IQueueProvider {
    enqueue(queueName: string, data: Record<string, unknown>): Promise<void>;
}
