import type { Job } from "bullmq";
import { Worker } from "bullmq";
import type { SweepAppointmentReviewsResult } from "@/core/application/booking/sweep-appointment-reviews.use-case";
import type { ILogger } from "@/core/providers/logger.interface";
import type { MaintenanceQueue } from "@/infrastructure/services/queue.service";
import {
    APPOINTMENT_REVIEW_SWEEP_JOB_NAME,
    MAINTENANCE_QUEUE_NAME,
    redisOptions,
    scheduleAppointmentReviewSweep,
} from "@/infrastructure/services/queue.service";

export type AppointmentReviewSweep = {
    execute(): Promise<SweepAppointmentReviewsResult>;
};

export type AppointmentReviewWorkerDependencies = {
    sweepAppointmentReviews: AppointmentReviewSweep;
    logger: ILogger;
    connection?: typeof redisOptions;
    maintenanceQueue?: MaintenanceQueue;
    schedule?: (maintenanceQueue: MaintenanceQueue) => Promise<void>;
};

export function createAppointmentReviewWorker({
    sweepAppointmentReviews,
    logger,
    connection = redisOptions,
    maintenanceQueue,
    schedule = scheduleAppointmentReviewSweep,
}: AppointmentReviewWorkerDependencies): Worker {
    const appointmentReviewWorker = new Worker(
        MAINTENANCE_QUEUE_NAME,
        async (job: Job) => {
            if (job.name !== APPOINTMENT_REVIEW_SWEEP_JOB_NAME) {
                logger.warn("Ignoring unsupported maintenance job", {
                    jobId: job.id,
                    jobName: job.name,
                });
                return;
            }

            logger.info("Appointment review sweep started", {
                jobId: job.id,
            });
            const result = await sweepAppointmentReviews.execute();
            logger.info("Appointment review sweep job completed", {
                jobId: job.id,
                candidates: result.candidates,
                transitioned: result.transitioned,
                conflicts: result.conflicts,
            });

            return result;
        },
        {
            connection,
            concurrency: 1,
        },
    );

    appointmentReviewWorker.on("failed", (job, error) => {
        logger.error("Appointment review sweep job failed", error, {
            jobId: job?.id,
        });
    });

    appointmentReviewWorker.on("error", (error) => {
        logger.error("Appointment review worker error", error);
    });

    if (maintenanceQueue) {
        void schedule(maintenanceQueue)
            .then(() => {
                logger.info("Appointment review sweep scheduler registered");
            })
            .catch((error: unknown) => {
                logger.error(
                    "Failed to register appointment review scheduler",
                    error,
                );
            });
    }

    return appointmentReviewWorker;
}
