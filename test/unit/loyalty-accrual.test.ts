import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@/config/db.config";
import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import { getLoyaltyCampaignAccrualCriteria } from "@/core/domain/loyalty/loyalty.policy";
import {
    type Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";
import { PrismaOrderRepository } from "@/infrastructure/database/prisma/order.prisma-repository";

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
        statusChangedAt: null,
        statusChangeReason: null,
        statusChangedById: null,
        notes: null,
        cancellationReason: null,
        couponId: null,
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
        const { useCase, appointmentRepository, featureRepository } =
            statusUseCase(AppointmentStatus.NEEDS_REVIEW);
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

            expect(appointmentRepository.updateStatus).toHaveBeenCalledTimes(1);
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
        jest.spyOn(prisma.loyaltyCampaign, "findFirst").mockResolvedValue(null);
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
        const campaignLookup = jest.spyOn(prisma.loyaltyCampaign, "findFirst");
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
        const campaignLookup = jest.spyOn(prisma.loyaltyCampaign, "findFirst");
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
        const campaignLookup = jest.spyOn(prisma.loyaltyCampaign, "findFirst");
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

type CampaignRow = {
    id: string;
    tenantId: string;
    status: string;
    source: string;
    metric: string;
    startsAt: Date;
    endsAt: Date;
};

type CampaignSelectionQuery = {
    where: {
        tenantId: string;
        status: string;
        source: { in: string[] };
        startsAt: { lte: Date };
        endsAt: { gt: Date };
    };
    orderBy: { startsAt: "asc" | "desc" };
};

/**
 * Answers the campaign-selection query the adapter actually emitted, the way
 * Postgres would: filter, then order, then take the first row.
 */
function selectCampaign(
    query: CampaignSelectionQuery,
    rows: CampaignRow[],
): CampaignRow | null {
    const { where, orderBy } = query;
    const eligible = rows
        .filter(
            (row) =>
                row.tenantId === where.tenantId &&
                row.status === where.status &&
                where.source.in.includes(row.source) &&
                row.startsAt.getTime() <= where.startsAt.lte.getTime() &&
                row.endsAt.getTime() > where.endsAt.gt.getTime(),
        )
        .sort((a, b) =>
            orderBy.startsAt === "desc"
                ? b.startsAt.getTime() - a.startsAt.getTime()
                : a.startsAt.getTime() - b.startsAt.getTime(),
        );
    return eligible[0] ?? null;
}

function campaignRow(overrides: Partial<CampaignRow> = {}): CampaignRow {
    return {
        id: "campaign-booking-older",
        tenantId: "tenant-1",
        status: "ACTIVE",
        source: "BOOKING",
        metric: "COUNT",
        startsAt: new Date("2029-12-01T00:00:00.000Z"),
        endsAt: new Date("2030-12-31T00:00:00.000Z"),
        ...overrides,
    };
}

/** The campaigns an APPOINTMENT event competes for: two BOOKING, one STORE, one ALL. */
function competingCampaigns() {
    return [
        campaignRow({ id: "campaign-booking-older" }),
        campaignRow({
            id: "campaign-booking-newer",
            startsAt: new Date("2030-01-01T00:00:00.000Z"),
        }),
        campaignRow({ id: "campaign-store", source: "STORE" }),
        campaignRow({ id: "campaign-all", source: "ALL" }),
    ];
}

function selectCampaignOver(rows: CampaignRow[]) {
    return jest
        .spyOn(prisma.loyaltyCampaign, "findFirst")
        .mockImplementation((async (args: unknown) => {
            const selected = selectCampaign(
                args as CampaignSelectionQuery,
                rows,
            );
            return selected
                ? { id: selected.id, metric: selected.metric }
                : null;
        }) as never);
}

function completeAppointment() {
    return new PrismaAppointmentRepository().updateStatus(
        "tenant-1",
        "appointment-1",
        {
            expectedStatus: AppointmentStatus.IN_PROGRESS,
            status: AppointmentStatus.COMPLETED,
            qualifyLoyalty: true,
        },
    );
}

function givenCommittedCompletion(rows: CampaignRow[]) {
    const transaction = useTransactionCallback();
    transaction.mockImplementation(
        (callback: (tx: typeof prisma) => Promise<unknown>) => callback(prisma),
    );
    jest.spyOn(prisma.appointment, "updateMany").mockResolvedValue({
        count: 1,
    });
    jest.spyOn(prisma.appointment, "findFirst").mockResolvedValue(
        appointment(AppointmentStatus.COMPLETED, "appointment-user-1") as never,
    );
    mockCommittedLoyaltyFeature();
    return {
        lookup: selectCampaignOver(rows),
        upsert: jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never),
    };
}

describe("Prisma appointment campaign selection", () => {
    const eventAt = new Date("2030-01-15T12:00:00.000Z");

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(eventAt);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test("accrues the completed appointment into the eligible campaign", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-booking" }),
        ]);

        await completeAppointment();

        expect(upsert).toHaveBeenCalledTimes(1);
        expect(upsert.mock.calls[0][0].create).toMatchObject({
            campaignId: "campaign-booking",
            sourceType: "APPOINTMENT",
            sourceId: "appointment-1",
            entryType: "ACCRUAL",
            reason: "appointment.completed",
            createdAt: eventAt,
        });
    });

    test.each([["BOOKING"], ["ALL"]])(
        "maps an APPOINTMENT event onto its own source and the catch-all",
        async (rowSource) => {
            const { lookup, upsert } = givenCommittedCompletion([
                campaignRow({ id: "campaign-store-only", source: "STORE" }),
                campaignRow({
                    id: "campaign-elsewhere",
                    source: rowSource,
                    startsAt: new Date("2029-01-01T00:00:00.000Z"),
                }),
            ]);

            await completeAppointment();

            const emitted = lookup.mock.calls[0][0] as CampaignSelectionQuery;
            expect(emitted.where.source.in).toEqual(["BOOKING", "ALL"]);
            expect(upsert.mock.calls[0][0].create.campaignId).toBe(
                "campaign-elsewhere",
            );
        },
    );

    test("never accrues an APPOINTMENT event into a STORE-only campaign", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-store-only", source: "STORE" }),
        ]);

        await completeAppointment();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues into the catch-all when no BOOKING campaign is eligible", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-store-only", source: "STORE" }),
            campaignRow({ id: "campaign-all", source: "ALL" }),
        ]);

        await completeAppointment();

        expect(upsert.mock.calls[0][0].create.campaignId).toBe("campaign-all");
    });

    test("accrues into the newest start when two eligible campaigns overlap", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-booking-older" }),
            campaignRow({
                id: "campaign-booking-newer",
                startsAt: new Date("2030-01-01T00:00:00.000Z"),
            }),
        ]);

        await completeAppointment();

        expect(upsert.mock.calls[0][0].create.campaignId).toBe(
            "campaign-booking-newer",
        );
    });

    test.each([
        [
            "a window that ended before the event",
            {
                startsAt: new Date("2029-01-01T00:00:00.000Z"),
                endsAt: new Date("2029-12-31T00:00:00.000Z"),
            },
        ],
        [
            "a window that starts after the event",
            {
                startsAt: new Date("2030-06-01T00:00:00.000Z"),
                endsAt: new Date("2030-12-31T00:00:00.000Z"),
            },
        ],
    ])("accrues nowhere into %s", async (_label, window) => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-outside", ...window }),
        ]);

        await completeAppointment();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues nowhere into a non-ACTIVE campaign", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-ended", status: "ENDED" }),
        ]);

        await completeAppointment();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("accrues nowhere into another tenant's campaign", async () => {
        const { upsert } = givenCommittedCompletion([
            campaignRow({ id: "campaign-other-tenant", tenantId: "tenant-2" }),
        ]);

        await completeAppointment();

        expect(upsert).not.toHaveBeenCalled();
    });

    test("emits the same query for the same event the domain criteria describe", async () => {
        const { lookup } = givenCommittedCompletion(competingCampaigns());

        await completeAppointment();

        const criteria = getLoyaltyCampaignAccrualCriteria(
            "APPOINTMENT" as never,
            eventAt,
        );
        expect(lookup.mock.calls[0][0]).toEqual({
            where: {
                tenantId: "tenant-1",
                status: criteria.status,
                source: { in: criteria.sources },
                startsAt: { lte: criteria.startsAtOnOrBefore },
                endsAt: { gt: criteria.endsAtAfter },
            },
            orderBy: { startsAt: "desc" },
            select: { id: true, metric: true },
        });
    });
});

describe("both accrual adapters resolve one campaign from one domain rule", () => {
    const eventAt = new Date("2030-01-15T12:00:00.000Z");

    beforeEach(() => {
        jest.useFakeTimers().setSystemTime(eventAt);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
    });

    test("keeps the campaign-selection rule out of both adapter sources", () => {
        for (const repository of [
            "infrastructure/database/prisma/order.prisma-repository.ts",
            "infrastructure/database/prisma/appointment.prisma-repository.ts",
        ]) {
            const source = readFileSync(
                join(__dirname, "..", "..", repository),
                "utf8",
            );
            expect(source).toContain("getLoyaltyCampaignAccrualCriteria(");
            expect(source).not.toMatch(/source:\s*\{\s*in:\s*\[/);
            expect(source).not.toMatch(/orderBy:\s*\{\s*startsAt:\s*"/);
        }
    });

    test("resolves the same campaign for the same event in both adapters", async () => {
        const catchAllOnly = [
            campaignRow({ id: "campaign-all", source: "ALL" }),
        ];

        useTransactionCallback().mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue({
            id: "order-1",
            userId: "order-owner",
            status: "ENTREGADO",
            items: [],
            subtotal: 19.9,
            total: 19.9,
            discountAmount: 0,
            couponId: null,
            trackingNumber: null,
            tenantId: "tenant-1",
            createdAt: new Date(eventAt),
            updatedAt: new Date(eventAt),
        } as never);
        mockCommittedLoyaltyFeature();
        const orderLookup = selectCampaignOver(catchAllOnly);
        const orderUpsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);

        await new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
            expectedStatus: "ENVIADO",
            status: "ENTREGADO",
            qualifyLoyalty: true,
        });
        const orderQuery = orderLookup.mock
            .calls[0][0] as CampaignSelectionQuery;
        const orderCampaign = orderUpsert.mock.calls[0][0].create
            .campaignId as string;
        jest.restoreAllMocks();

        const { lookup, upsert } = givenCommittedCompletion(catchAllOnly);
        await completeAppointment();
        const appointmentQuery = lookup.mock
            .calls[0][0] as CampaignSelectionQuery;
        const appointmentCampaign = upsert.mock.calls[0][0].create
            .campaignId as string;

        expect(appointmentCampaign).toBe(orderCampaign);
        expect(orderCampaign).toBe("campaign-all");
        expect(orderQuery.where.source.in).toEqual(["STORE", "ALL"]);
        expect(appointmentQuery.where.source.in).toEqual(["BOOKING", "ALL"]);
        expect(orderQuery.where.startsAt.lte).toBe(orderQuery.where.endsAt.gt);
        expect(appointmentQuery.where.startsAt.lte).toBe(
            appointmentQuery.where.endsAt.gt,
        );
        expect(orderQuery.orderBy).toEqual(appointmentQuery.orderBy);
    });

    test("separates the two events by their mapped source over one campaign set", async () => {
        const rows = competingCampaigns();

        useTransactionCallback().mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.order, "updateMany").mockResolvedValue({ count: 1 });
        jest.spyOn(prisma.order, "findFirst").mockResolvedValue({
            id: "order-1",
            userId: "order-owner",
            status: "ENTREGADO",
            items: [],
            subtotal: 19.9,
            total: 19.9,
            discountAmount: 0,
            couponId: null,
            trackingNumber: null,
            tenantId: "tenant-1",
            createdAt: new Date(eventAt),
            updatedAt: new Date(eventAt),
        } as never);
        mockCommittedLoyaltyFeature();
        const orderLookup = selectCampaignOver(rows);
        const _orderUpsert = jest
            .spyOn(prisma.loyaltyLedgerEntry, "upsert")
            .mockResolvedValue({} as never);

        await new PrismaOrderRepository().updateStatus("tenant-1", "order-1", {
            expectedStatus: "ENVIADO",
            status: "ENTREGADO",
            qualifyLoyalty: true,
        });
        const orderQuery = orderLookup.mock
            .calls[0][0] as CampaignSelectionQuery;
        const orderCampaign = selectCampaign(orderQuery, rows);
        jest.restoreAllMocks();

        const { lookup } = givenCommittedCompletion(rows);
        await completeAppointment();
        const appointmentQuery = lookup.mock
            .calls[0][0] as CampaignSelectionQuery;
        const appointmentCampaign = selectCampaign(appointmentQuery, rows);

        expect(orderCampaign?.id).toBe("campaign-store");
        expect(appointmentCampaign?.id).toBe("campaign-booking-newer");
        expect(orderQuery.where.status).toBe(appointmentQuery.where.status);
        expect(orderQuery.orderBy).toEqual({ startsAt: "desc" });
    });
});
