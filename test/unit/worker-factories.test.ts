import { Worker } from "bullmq";
import { createAppointmentReviewWorker } from "../../infrastructure/workers/appointment-review.worker";
import { createNotificationWorker } from "../../infrastructure/workers/notification.worker";

const mockWorkerInstance = {
    on: jest.fn().mockReturnThis(),
};
const mockLogger = {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logRequest: jest.fn(),
    logResponse: jest.fn(),
};

jest.mock("bullmq", () => ({
    Job: jest.fn(),
    Worker: jest.fn().mockImplementation(() => mockWorkerInstance),
}));
jest.mock("@/infrastructure/services/queue.service", () => ({
    APPOINTMENT_REVIEW_SWEEP_JOB_NAME: "appointment-review-sweep",
    MAINTENANCE_QUEUE_NAME: "maintenance",
    redisOptions: { host: "localhost", port: 6379 },
    scheduleAppointmentReviewSweep: jest.fn(
        (_maintenanceQueue: unknown) => Promise.resolve(),
    ),
}));
jest.mock("@/infrastructure/services/email.service", () => ({
    emailService: {
        sendAppointmentConfirmation: jest.fn(),
        sendAppointmentCancellation: jest.fn(),
        sendEmail: jest.fn(),
        sendWelcomeEmail: jest.fn(),
        sendPasswordReset: jest.fn(),
    },
}));
jest.mock("@/infrastructure/services/notification.service", () => ({
    notificationService: { notify: jest.fn() },
}));
jest.mock("@/infrastructure/utils/ics-generator.util", () => ({
    generateAppointmentIcs: jest.fn(),
}));

describe("appointment review worker factory", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("creates the worker and scheduler only when invoked", async () => {
        const WorkerMock = Worker as unknown as jest.Mock;
        const execute = jest.fn().mockResolvedValue({
            candidates: 1,
            transitioned: 1,
            conflicts: 0,
            activationCutoff: new Date(),
            eligibleThrough: new Date(),
        });
        const schedule = jest.fn().mockResolvedValue(undefined);
        const maintenanceQueue = { upsertJobScheduler: jest.fn() };
        const connection = { host: "test", port: 1 };

        expect(WorkerMock).not.toHaveBeenCalled();
        const worker = createAppointmentReviewWorker({
            sweepAppointmentReviews: { execute } as never,
            logger: mockLogger,
            connection,
            maintenanceQueue,
            schedule,
        });

        expect(worker).toBe(mockWorkerInstance);
        expect(WorkerMock).toHaveBeenCalledWith(
            "maintenance",
            expect.any(Function),
            { connection, concurrency: 1 },
        );
        expect(mockWorkerInstance.on).toHaveBeenCalledWith(
            "failed",
            expect.any(Function),
        );
        expect(mockWorkerInstance.on).toHaveBeenCalledWith(
            "error",
            expect.any(Function),
        );
        expect(schedule).toHaveBeenCalledWith(maintenanceQueue);

        const processor = WorkerMock.mock.calls[0]![1] as (
            job: { id: string; name: string },
        ) => Promise<unknown>;
        await expect(
            processor({ id: "sweep-1", name: "appointment-review-sweep" }),
        ).resolves.toEqual(expect.objectContaining({ candidates: 1 }));
        expect(execute).toHaveBeenCalledTimes(1);
    });

    it("keeps unsupported maintenance jobs ignored", async () => {
        const WorkerMock = Worker as unknown as jest.Mock;
        const execute = jest.fn();
        createAppointmentReviewWorker({
            sweepAppointmentReviews: { execute } as never,
            logger: mockLogger,
            maintenanceQueue: { upsertJobScheduler: jest.fn() },
            schedule: jest.fn().mockResolvedValue(undefined),
        });

        const processor = WorkerMock.mock.calls[0]![1] as (
            job: { id: string; name: string },
        ) => Promise<unknown>;
        await processor({ id: "other-1", name: "other-job" });

        expect(execute).not.toHaveBeenCalled();
    });

    it("creates the notification factory with injected repositories and failed listener", async () => {
        const WorkerMock = Worker as unknown as jest.Mock;
        const appointmentRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "appointment-1",
                startTime: new Date("2030-01-01T12:00:00.000Z"),
                notes: "note",
                user: {
                    email: "user@example.com",
                    name: "User",
                    phone: null,
                    pushToken: null,
                },
                service: null,
                staff: null,
            }),
        };
        const tenantRepository = {
            findById: jest.fn().mockResolvedValue({
                name: "Tenant",
                config: {},
            }),
        };
        const email = {
            sendAppointmentConfirmation: jest.fn().mockResolvedValue(undefined),
        };
        const notifications = { notify: jest.fn() };
        const generateIcs = jest.fn().mockResolvedValue("ics-content");
        const log = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };
        const connection = { host: "test", port: 1 };

        const worker = createNotificationWorker({
            appointmentRepository: appointmentRepository as never,
            tenantRepository: tenantRepository as never,
            connection,
            emailService: email as never,
            notificationService: notifications as never,
            generateAppointmentIcs: generateIcs as never,
            logger: log as never,
        });

        expect(worker).toBe(mockWorkerInstance);
        expect(WorkerMock).toHaveBeenCalledWith(
            "notifications",
            expect.any(Function),
            { connection, concurrency: 5 },
        );
        expect(mockWorkerInstance.on).toHaveBeenCalledWith(
            "failed",
            expect.any(Function),
        );

        const processor = WorkerMock.mock.calls[0]![1] as (
            job: { id: string; data: Record<string, unknown> },
        ) => Promise<unknown>;
        await processor({
            id: "notification-1",
            data: {
                type: "CONFIRMED",
                appointmentId: "appointment-1",
                tenantId: "tenant-1",
            },
        });
        expect(appointmentRepository.findById).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            true,
        );
        expect(tenantRepository.findById).toHaveBeenCalledWith("tenant-1");
        expect(email.sendAppointmentConfirmation).toHaveBeenCalled();

        const failedListener = mockWorkerInstance.on.mock.calls.find(
            ([event]) => event === "failed",
        )![1] as (job: { id: string }, error: Error) => void;
        failedListener({ id: "failed-1" }, new Error("failure"));
        expect(log.error).toHaveBeenCalledWith(
            "[NotificationWorker] Job failed-1 failed definitely: failure",
        );
    });
});
