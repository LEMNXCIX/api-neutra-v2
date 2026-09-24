import { Job, Worker } from "bullmq";
import { Container } from "@/infrastructure/config/container";
import { logger } from "@/infrastructure/providers/logger.instance";
import {
    APPOINTMENT_REVIEW_SWEEP_JOB_NAME,
    MAINTENANCE_QUEUE_NAME,
    redisOptions,
    scheduleAppointmentReviewSweep,
} from "@/infrastructure/services/queue.service";

const sweepAppointmentReviews = Container.getSweepAppointmentReviewsUseCase();

export const appointmentReviewWorker = new Worker(
    MAINTENANCE_QUEUE_NAME,
    async (job: Job) => {
        if (job.name !== APPOINTMENT_REVIEW_SWEEP_JOB_NAME) {
            logger.warn("Ignoring unsupported maintenance job", {
                jobId: job.id,
                jobName: job.name,
            });
            return;
        }

        logger.info("Appointment review sweep started", { jobId: job.id });
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
        connection: redisOptions,
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

void scheduleAppointmentReviewSweep()
    .then(() => {
        logger.info("Appointment review sweep scheduler registered");
    })
    .catch((error: unknown) => {
        logger.error("Failed to register appointment review scheduler", error);
    });
