import { Queue } from "bullmq";

export const redisOptions = {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT || "6379"),
    // password: process.env.REDIS_PASSWORD // Add if needed
};

export const MAINTENANCE_QUEUE_NAME = "maintenance";
export const APPOINTMENT_REVIEW_SWEEP_JOB_NAME =
    "appointment-review-sweep";
export const APPOINTMENT_REVIEW_SWEEP_SCHEDULER_ID =
    "appointment-review-sweep-v1";
export const APPOINTMENT_REVIEW_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export type MaintenanceQueue = Pick<Queue, "upsertJobScheduler">;

export function createNotificationQueue(
    connection = redisOptions,
): Queue {
    return new Queue("notifications", { connection });
}

export function createMaintenanceQueue(
    connection = redisOptions,
): Queue {
    return new Queue(MAINTENANCE_QUEUE_NAME, { connection });
}

export async function scheduleAppointmentReviewSweep(
    maintenanceQueue: MaintenanceQueue,
): Promise<void> {
    await maintenanceQueue.upsertJobScheduler(
        APPOINTMENT_REVIEW_SWEEP_SCHEDULER_ID,
        { every: APPOINTMENT_REVIEW_SWEEP_INTERVAL_MS },
        {
            name: APPOINTMENT_REVIEW_SWEEP_JOB_NAME,
            data: {},
            opts: {
                attempts: 3,
                backoff: {
                    type: "exponential",
                    delay: 5000,
                },
                removeOnComplete: true,
                removeOnFail: false,
            },
        },
    );
}
