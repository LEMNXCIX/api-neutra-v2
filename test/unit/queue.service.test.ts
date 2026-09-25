import { Queue } from "bullmq";
import {
    APPOINTMENT_REVIEW_SWEEP_INTERVAL_MS,
    APPOINTMENT_REVIEW_SWEEP_JOB_NAME,
    APPOINTMENT_REVIEW_SWEEP_SCHEDULER_ID,
    createMaintenanceQueue,
    createNotificationQueue,
    scheduleAppointmentReviewSweep,
} from "../../infrastructure/services/queue.service";

const mockQueue = {
    upsertJobScheduler: jest.fn().mockResolvedValue(undefined),
};

jest.mock("bullmq", () => ({
    Queue: jest.fn().mockImplementation(() => mockQueue),
}));

describe("queue service ownership", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("creates notification and maintenance queues only through factories", () => {
        const QueueMock = Queue as unknown as jest.Mock;
        const connection = { host: "test", port: 1 };

        expect(QueueMock).not.toHaveBeenCalled();
        createNotificationQueue(connection);
        createMaintenanceQueue(connection);

        expect(QueueMock).toHaveBeenNthCalledWith(1, "notifications", {
            connection,
        });
        expect(QueueMock).toHaveBeenNthCalledWith(2, "maintenance", {
            connection,
        });
    });

    it("registers the appointment sweep on the supplied queue", async () => {
        await scheduleAppointmentReviewSweep(mockQueue);

        expect(mockQueue.upsertJobScheduler).toHaveBeenCalledWith(
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
    });
});
