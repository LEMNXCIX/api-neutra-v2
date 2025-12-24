import { Queue } from 'bullmq';

export const redisOptions = {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // password: process.env.REDIS_PASSWORD // Add if needed
};

// Singleton to manage the 'notifications' queue
export const notificationQueue = new Queue('notifications', {
    connection: redisOptions
});

export const addToQueue = async (jobName: string, data: any) => {
    return notificationQueue.add(jobName, data, {
        attempts: 3, // Retry failed jobs 3 times
        backoff: {
            type: 'exponential',
            delay: 1000 // Initial delay 1s
        },
        removeOnComplete: true, // Keep Redis clean
        removeOnFail: false // Keep failed jobs for inspection
    });
};
