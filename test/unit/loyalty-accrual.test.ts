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

function mockCommittedLoyaltyFeature(enabled = true) {
    return jest
        .spyOn(prisma.tenantFeature, "findFirst")
        .mockResolvedValue(enabled ? ({ id: "feature-1" } as never) : null);
}

describe("appointment loyalty accrual use case", () => {
    test("requests loyalty qualification for COMPLETED only when LOYALTY is enabled", async () => {
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
                qualifyLoyalty: true,
            },
        );
        expect(featureRepository.getTenantFeatureStatus).toHaveBeenCalledTimes(
            1,
        );
        expect(queueProvider.enqueue).not.toHaveBeenCalled();
    });

    test("requests qualification when NEEDS_REVIEW is resolved as COMPLETED", async () => {
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
                qualifyLoyalty: true,
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
        ).not.toHaveProperty("qualifyLoyalty");
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
            ).not.toHaveProperty("qualifyLoyalty");
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
        const featureLookup = mockCommittedLoyaltyFeature();
        const campaignLookup = jest
            .spyOn(prisma.loyaltyCampaign, "findFirst")
            .mockResolvedValue({ id: "campaign-1", metric: "COUNT" } as never);
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
                    qualifyLoyalty: true,
                },
            ),
        ).resolves.toMatchObject({
            status: AppointmentStatus.COMPLETED,
            userId: "appointment-user-1",
        });

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(updateMany).toHaveBeenCalledTimes(1);
        expect(findFirst).toHaveBeenCalledTimes(1);
        expect(featureLookup).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                enabled: true,
                feature: { key: "LOYALTY" },
            },
            select: { id: true },
        });
        const eventAt = (
            updateMany.mock.calls[0][0] as {
                data: { statusChangedAt: Date };
            }
        ).data.statusChangedAt;
        expect(campaignLookup).toHaveBeenCalledWith({
            where: {
                tenantId: "tenant-1",
                status: "ACTIVE",
                source: { in: ["BOOKING", "ALL"] },
                startsAt: { lte: eventAt },
                endsAt: { gt: eventAt },
            },
            orderBy: { startsAt: "desc" },
            select: { id: true, metric: true },
        });
        expect(upsert).toHaveBeenCalledWith({
            where: {
                campaignId_sourceType_sourceId_entryType: {
                    campaignId: "campaign-1",
                    sourceType: "APPOINTMENT",
                    sourceId: "appointment-1",
                    entryType: "ACCRUAL",
                },
            },
            create: {
                tenantId: "tenant-1",
                campaignId: "campaign-1",
                userId: "appointment-user-1",
                sourceType: "APPOINTMENT",
                sourceId: "appointment-1",
                value: "1.00",
                entryType: "ACCRUAL",
                reason: "appointment.completed",
                createdAt: eventAt,
            },
            update: {},
        });
    });

    test("does not write a ledger entry without an active campaign", async () => {
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
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue(
            null,
        );
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await new PrismaAppointmentRepository().updateStatus(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.IN_PROGRESS,
                status: AppointmentStatus.COMPLETED,
                qualifyLoyalty: true,
            },
        );

        expect(upsert).not.toHaveBeenCalled();
    });

    test("commits completion without qualification when LOYALTY is disabled in-transaction", async () => {
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
        const featureLookup = mockCommittedLoyaltyFeature(false);
        const campaignLookup = jest.spyOn(
            prisma.loyaltyCampaign,
            "findFirst",
        );
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await expect(
            new PrismaAppointmentRepository().updateStatus(
                "tenant-1",
                "appointment-1",
                {
                    expectedStatus: AppointmentStatus.IN_PROGRESS,
                    status: AppointmentStatus.COMPLETED,
                    qualifyLoyalty: true,
                },
            ),
        ).resolves.toMatchObject({
            status: AppointmentStatus.COMPLETED,
        });

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(featureLookup).toHaveBeenCalledTimes(1);
        expect(campaignLookup).not.toHaveBeenCalled();
        expect(upsert).not.toHaveBeenCalled();
    });

    test.each([
        AppointmentStatus.NEEDS_REVIEW,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ])("does not qualify a %s update", async (status) => {
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
        const campaignLookup = jest.spyOn(
            prisma.loyaltyCampaign,
            "findFirst",
        );
        const upsert = jest.spyOn(prisma.loyaltyLedgerEntry, "upsert");

        await new PrismaAppointmentRepository().updateStatus(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.PENDING,
                status,
                qualifyLoyalty: true,
            },
        );

        expect(campaignLookup).not.toHaveBeenCalled();
        expect(upsert).not.toHaveBeenCalled();
    });

    test("does not qualify COMPLETED without the marker", async () => {
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
        const campaignLookup = jest.spyOn(
            prisma.loyaltyCampaign,
            "findFirst",
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

        expect(campaignLookup).not.toHaveBeenCalled();
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
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue({
            id: "campaign-1",
            metric: "COUNT",
        } as never);
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);
        const repository = new PrismaAppointmentRepository();
        const update = {
            expectedStatus: AppointmentStatus.IN_PROGRESS,
            status: AppointmentStatus.COMPLETED,
            qualifyLoyalty: true as const,
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
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue({
            id: "campaign-1",
            metric: "COUNT",
        } as never);
        const upsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);
        const repository = new PrismaAppointmentRepository();
        const update = {
            expectedStatus: AppointmentStatus.IN_PROGRESS,
            status: AppointmentStatus.COMPLETED,
            qualifyLoyalty: true as const,
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
        mockCommittedLoyaltyFeature();
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue({
            id: "campaign-1",
            metric: "COUNT",
        } as never);
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
                    qualifyLoyalty: true,
                },
            ),
        ).rejects.toBe(error);
        expect(currentStatus).toBe(AppointmentStatus.IN_PROGRESS);
    });
});
