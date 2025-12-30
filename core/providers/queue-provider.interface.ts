export interface IQueueProvider {
    enqueue(queueName: string, data: any): Promise<void>;
}
