import type { Queue } from "bullmq";
import type { IQueueProvider } from "@/core/providers/queue-provider.interface";

export class BullMQQueueProvider implements IQueueProvider {
    constructor(private readonly queue: Pick<Queue, "add">) {}

    async enqueue(
        queueName: string,
        data: Record<string, unknown>,
    ): Promise<void> {
        await this.queue.add(queueName, data, {
            attempts: 3,
            backoff: {
                type: "exponential",
                delay: 1000,
            },
            removeOnComplete: true,
            removeOnFail: false,
        });
    }
}
