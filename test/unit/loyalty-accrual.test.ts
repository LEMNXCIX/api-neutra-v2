import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { prisma } from "@/config/db.config";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";

const manager = {
    id: "staff-1",
    canManage: true,
    canDelete: true,
};

function appointment(
    status: AppointmentStatus,
    userId = "appointment-owner",
): Appointment {
    return {
        id: "appointment-1",
        userId,
        serviceId: "service-1",
        staffId: "staff-record-1",
        startTime: new Date("2030-01-01T10:00:00.000Z"),
        endTime: new Date("2030-01-01T11:00:00.000Z"),
        status,
        notes: undefined,
        cancellationReason: undefined,
        confirmationSent: false,
        reminderSent: false,
        tenantId: "tenant-1",
        createdAt: new Date("2030-01-01T09:00:00.000Z"),
        updatedAt: new Date("2030-01-01T09:00:00.000Z"),
        discountAmount: 0,
        subtotal: 10,
        total: 10,
    };
}

function statusUseCase(currentStatus = AppointmentStatus.IN_PROGRESS) {
    const appointmentRepository = {
        findById: jest.fn().mockResolvedValue(appointment(currentStatus)),
        updateStatus: jest.fn(),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue({}),
    };
    const queueProvider = { enqueue: jest.fn() };
    const useCase = new UpdateAppointmentStatusUseCase(
        appointmentRepository as unknown as IAppointmentRepository,
        queueProvider as never,
        featureRepository as never,
    );

    return {
        useCase,
        appointmentRepository,
        featureRepository,
        queueProvider,
    };
}

function useTransactionCallback() {
    return jest.spyOn(prisma, "$transaction") as unknown as jest.Mock;
}

describe("appointment loyalty accrual use case", () => {
    test("requests one point for COMPLETED only when LOYALTY is enabled", async () => {
        const {
            useCase,
            appointmentRepository,
            featureRepository,
            queueProvider,
        } = statusUseCase();
        appointmentRepository.updateStatus.mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED),
        );
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: true,
            EMAIL_NOTIFICATIONS: true,
        });

        await useCase.execute(
            "tenant-1",
            "appointment-1",
            AppointmentStatus.COMPLETED,
            manager,
        );

        expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.IN_PROGRESS,
                status: AppointmentStatus.COMPLETED,
                reason: undefined,
                actorId: manager.id,
                loyaltyAward: { points: 1 },
            },
        );
        expect(featureRepository.getTenantFeatureStatus).toHaveBeenCalledTimes(
            1,
        );
        expect(queueProvider.enqueue).not.toHaveBeenCalled();
    });

    test("awards a point when NEEDS_REVIEW is resolved as COMPLETED", async () => {
        const {
            useCase,
            appointmentRepository,
            featureRepository,
        } = statusUseCase(AppointmentStatus.NEEDS_REVIEW);
        appointmentRepository.updateStatus.mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED),
        );
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: true,
        });

        await useCase.execute(
            "tenant-1",
            "appointment-1",
            AppointmentStatus.COMPLETED,
            manager,
        );

        expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            expect.objectContaining({
                expectedStatus: AppointmentStatus.NEEDS_REVIEW,
                status: AppointmentStatus.COMPLETED,
                loyaltyAward: { points: 1 },
            }),
        );
    });

    test("does not request an award when LOYALTY is disabled", async () => {
        const { useCase, appointmentRepository, featureRepository } =
            statusUseCase();
        appointmentRepository.updateStatus.mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED),
        );
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            LOYALTY: false,
        });

        await useCase.execute(
            "tenant-1",
            "appointment-1",
            AppointmentStatus.COMPLETED,
            manager,
        );

        expect(appointmentRepository.updateStatus).toHaveBeenCalledTimes(1);
        expect(
            appointmentRepository.updateStatus.mock.calls[0][2],
        ).not.toHaveProperty("loyaltyAward");
    });

    test("does not write status when the COMPLETED feature lookup fails", async () => {
        const { useCase, appointmentRepository, featureRepository } =
            statusUseCase();
        const error = new Error("feature lookup failed");
        featureRepository.getTenantFeatureStatus.mockRejectedValue(error);

        await expect(
            useCase.execute(
                "tenant-1",
                "appointment-1",
                AppointmentStatus.COMPLETED,
                manager,
            ),
        ).rejects.toBe(error);
        expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    test.each([
        [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
        [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED],
        [AppointmentStatus.NEEDS_REVIEW, AppointmentStatus.NO_SHOW],
    ])(
        "does not request an award for %s -> %s",
        async (currentStatus, nextStatus) => {
            const {
                useCase,
                appointmentRepository,
                featureRepository,
                queueProvider,
            } = statusUseCase(currentStatus);
            appointmentRepository.updateStatus.mockResolvedValue(
                appointment(nextStatus),
            );
            featureRepository.getTenantFeatureStatus.mockResolvedValue({
                LOYALTY: true,
                EMAIL_NOTIFICATIONS: true,
            });

            await useCase.execute(
                "tenant-1",
                "appointment-1",
                nextStatus,
                manager,
                undefined,
                "booking-page",
            );

            expect(appointmentRepository.updateStatus).toHaveBeenCalledTimes(
                1,
            );
            expect(
                appointmentRepository.updateStatus.mock.calls[0][2],
            ).not.toHaveProperty("loyaltyAward");
            if (
                nextStatus === AppointmentStatus.CONFIRMED ||
                nextStatus === AppointmentStatus.CANCELLED
            ) {
                expect(queueProvider.enqueue).toHaveBeenCalledWith(
                    "notifications",
                    {
                        type: nextStatus,
                        appointmentId: "appointment-1",
                        tenantId: "tenant-1",
                        origin: "booking-page",
                    },
                );
            } else {
                expect(queueProvider.enqueue).not.toHaveBeenCalled();
            }
        },
    );
});

describe("Prisma appointment loyalty transaction", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("upserts the award from the appointment user in the status transaction", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        const updateMany = jest
            .spyOn(prisma.appointment, "updateMany")
            .mockResolvedValue({ count: 1 });
        const findFirst = jest
            .spyOn(prisma.appointment, "findFirst")
            .mockResolvedValue(
                appointment(
                    AppointmentStatus.COMPLETED,
                    "appointment-user-1",
                ) as never,
            );
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);

        await expect(
            new PrismaAppointmentRepository().updateStatus(
                "tenant-1",
                "appointment-1",
                {
                    expectedStatus: AppointmentStatus.IN_PROGRESS,
                    status: AppointmentStatus.COMPLETED,
                    loyaltyAward: { points: 1 },
                },
            ),
        ).resolves.toMatchObject({
            status: AppointmentStatus.COMPLETED,
            userId: "appointment-user-1",
        });

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(updateMany).toHaveBeenCalledTimes(1);
        expect(findFirst).toHaveBeenCalledTimes(1);
        expect(upsert).toHaveBeenCalledWith({
            where: {
                tenantId_sourceAppointmentId: {
                    tenantId: "tenant-1",
                    sourceAppointmentId: "appointment-1",
                },
            },
            create: {
                tenantId: "tenant-1",
                userId: "appointment-user-1",
                sourceAppointmentId: "appointment-1",
                points: 1,
                reason: "appointment.completed",
            },
            update: {},
        });
    });

    test.each([
        AppointmentStatus.NEEDS_REVIEW,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ])("does not award points for a %s update", async (status) => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.appointment, "updateMany").mockResolvedValue({
            count: 1,
        });
        jest.spyOn(prisma.appointment, "findFirst").mockResolvedValue(
            appointment(status) as never,
        );
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await new PrismaAppointmentRepository().updateStatus(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.PENDING,
                status,
                loyaltyAward: { points: 1 },
            },
        );

        expect(upsert).not.toHaveBeenCalled();
    });

    test("does not award points when COMPLETED has no award input", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.appointment, "updateMany").mockResolvedValue({
            count: 1,
        });
        jest.spyOn(prisma.appointment, "findFirst").mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED) as never,
        );
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await new PrismaAppointmentRepository().updateStatus(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.IN_PROGRESS,
                status: AppointmentStatus.COMPLETED,
            },
        );

        expect(upsert).not.toHaveBeenCalled();
    });

    test("keeps duplicate retries idempotent with an empty upsert update", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.appointment, "updateMany").mockResolvedValue({
            count: 1,
        });
        jest.spyOn(prisma.appointment, "findFirst").mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED) as never,
        );
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);
        const repository = new PrismaAppointmentRepository();
        const update = {
            expectedStatus: AppointmentStatus.IN_PROGRESS,
            status: AppointmentStatus.COMPLETED,
            loyaltyAward: { points: 1 as const },
        };

        await repository.updateStatus("tenant-1", "appointment-1", update);
        await repository.updateStatus("tenant-1", "appointment-1", update);

        expect(upsert).toHaveBeenCalledTimes(2);
        expect(upsert).toHaveBeenLastCalledWith(
            expect.objectContaining({ update: {} }),
        );
    });

    test("allows only one concurrent completion to create the award", async () => {
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        const updateMany = jest
            .spyOn(prisma.appointment, "updateMany")
            .mockResolvedValueOnce({ count: 1 })
            .mockResolvedValueOnce({ count: 0 });
        jest.spyOn(prisma.appointment, "findFirst").mockResolvedValue(
            appointment(AppointmentStatus.COMPLETED) as never,
        );
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);
        const repository = new PrismaAppointmentRepository();
        const update = {
            expectedStatus: AppointmentStatus.IN_PROGRESS,
            status: AppointmentStatus.COMPLETED,
            loyaltyAward: { points: 1 as const },
        };

        const results = await Promise.all([
            repository.updateStatus("tenant-1", "appointment-1", update),
            repository.updateStatus("tenant-1", "appointment-1", update),
        ]);

        expect(results[0]?.status).toBe(AppointmentStatus.COMPLETED);
        expect(results[1]).toBeNull();
        expect(updateMany).toHaveBeenCalledTimes(2);
        expect(upsert).toHaveBeenCalledTimes(1);
    });

    test("propagates a ledger failure so the status transaction rolls back", async () => {
        const error = new Error("ledger write failed");
        let currentStatus = AppointmentStatus.IN_PROGRESS;
        const transaction = useTransactionCallback();
        transaction.mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) => {
                const statusBeforeTransaction = currentStatus;
                try {
                    return await callback(prisma);
                } catch (caught) {
                    currentStatus = statusBeforeTransaction;
                    throw caught;
                }
            },
        );
        const updateMany = jest.spyOn(
            prisma.appointment,
            "updateMany",
        ) as unknown as jest.Mock;
        updateMany.mockImplementation(
            async ({ data }: { data: { status: AppointmentStatus } }) => {
                currentStatus = data.status;
                return { count: 1 };
            },
        );
        const findFirst = jest.spyOn(
            prisma.appointment,
            "findFirst",
        ) as unknown as jest.Mock;
        findFirst.mockImplementation(async () => appointment(currentStatus));
        jest.spyOn(prisma.loyaltyLedgerEntry, "upsert").mockRejectedValue(
            error,
        );

        await expect(
            new PrismaAppointmentRepository().updateStatus(
                "tenant-1",
                "appointment-1",
                {
                    expectedStatus: AppointmentStatus.IN_PROGRESS,
                    status: AppointmentStatus.COMPLETED,
                    loyaltyAward: { points: 1 },
                },
            ),
        ).rejects.toBe(error);
        expect(currentStatus).toBe(AppointmentStatus.IN_PROGRESS);
    });
});
