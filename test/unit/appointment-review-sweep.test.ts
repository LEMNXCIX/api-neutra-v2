import {
    APPOINTMENT_REVIEW_SYSTEM_REASON,
    resolveAppointmentReviewActivationCutoff,
    SweepAppointmentReviewsUseCase,
} from "@/core/application/booking/sweep-appointment-reviews.use-case";
import { AppointmentStatus } from "@/core/entities/appointment.entity";
import { ILogger } from "@/core/providers/logger.interface";
import {
    AppointmentReviewCandidate,
    IAppointmentRepository,
} from "@/core/repositories/appointment.repository.interface";
import { getTimezoneOrUtc } from "@/core/utils/tenant-time";
import { prisma } from "@/config/db.config";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";

const createLogger = (): ILogger => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    logRequest: jest.fn(),
    logResponse: jest.fn(),
});

const createRepository = (): jest.Mocked<IAppointmentRepository> =>
    ({
        findReviewCandidates: jest.fn().mockResolvedValue([]),
        markNeedsReview: jest.fn().mockResolvedValue(true),
    }) as unknown as jest.Mocked<IAppointmentRepository>;

const candidate = (
    overrides: Partial<AppointmentReviewCandidate> = {},
): AppointmentReviewCandidate => ({
    id: "appointment-1",
    tenantId: "tenant-1",
    status: AppointmentStatus.CONFIRMED,
    endTime: new Date("2030-01-01T10:00:00.000Z"),
    tenantTimezone: "America/Sao_Paulo",
    ...overrides,
});

describe("SweepAppointmentReviewsUseCase", () => {
    test("uses an absolute endTime plus two-hour deadline, including the boundary", async () => {
        const repository = createRepository();
        const changedAt = new Date("2030-01-01T12:00:00.000Z");
        const activationCutoff = new Date("2029-12-31T00:00:00.000Z");
        repository.findReviewCandidates.mockResolvedValue([
            candidate({ endTime: new Date("2030-01-01T10:00:00.000Z") }),
        ]);
        const useCase = new SweepAppointmentReviewsUseCase(
            repository,
            createLogger(),
            {
                activationCutoff,
                now: () => changedAt,
            },
        );

        const result = await useCase.execute();

        expect(repository.findReviewCandidates).toHaveBeenCalledWith({
            activationCutoff,
            eligibleThrough: new Date("2030-01-01T10:00:00.000Z"),
            limit: 100,
        });
        expect(repository.markNeedsReview).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            AppointmentStatus.CONFIRMED,
            activationCutoff,
            new Date("2030-01-01T10:00:00.000Z"),
            changedAt,
            APPOINTMENT_REVIEW_SYSTEM_REASON,
        );
        expect(result.transitioned).toBe(1);
    });

    test("uses process start when the configured activation cutoff is absent or invalid", () => {
        const processStart = new Date("2030-01-01T08:00:00.000Z");

        expect(
            resolveAppointmentReviewActivationCutoff(undefined, processStart),
        ).toEqual({ cutoff: processStart, source: "process-start" });
        expect(
            resolveAppointmentReviewActivationCutoff(
                "not-an-absolute-instant",
                processStart,
            ),
        ).toEqual({ cutoff: processStart, source: "process-start" });
        expect(
            resolveAppointmentReviewActivationCutoff(
                "2030-01-01T09:00:00+02:00",
                processStart,
            ),
        ).toEqual({
            cutoff: new Date("2030-01-01T07:00:00.000Z"),
            source: "environment",
        });
    });

    test("does not transition the same candidate twice on repeated execution", async () => {
        const repository = createRepository();
        const now = new Date("2030-01-01T13:00:00.000Z");
        let status = AppointmentStatus.CONFIRMED;
        repository.findReviewCandidates.mockImplementation(async () =>
            [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS].includes(
                status,
            )
                ? [candidate({ status })]
                : [],
        );
        repository.markNeedsReview.mockImplementation(async () => {
            if (status !== AppointmentStatus.CONFIRMED) return false;
            status = AppointmentStatus.NEEDS_REVIEW;
            return true;
        });
        const useCase = new SweepAppointmentReviewsUseCase(
            repository,
            createLogger(),
            {
                activationCutoff: new Date("2030-01-01T00:00:00.000Z"),
                now: () => now,
            },
        );

        await expect(useCase.execute()).resolves.toMatchObject({
            candidates: 1,
            transitioned: 1,
            conflicts: 0,
        });
        await expect(useCase.execute()).resolves.toMatchObject({
            candidates: 0,
            transitioned: 0,
            conflicts: 0,
        });
        expect(repository.markNeedsReview).toHaveBeenCalledTimes(1);
    });

    test("reports a guarded update conflict without overwriting a concurrent staff action", async () => {
        const repository = createRepository();
        repository.findReviewCandidates.mockResolvedValue([candidate()]);
        repository.markNeedsReview.mockResolvedValue(false);
        const useCase = new SweepAppointmentReviewsUseCase(
            repository,
            createLogger(),
            {
                activationCutoff: new Date("2030-01-01T00:00:00.000Z"),
                now: () => new Date("2030-01-01T13:00:00.000Z"),
            },
        );

        const result = await useCase.execute();

        expect(result).toMatchObject({
            candidates: 1,
            transitioned: 0,
            conflicts: 1,
        });
    });
});

describe("Prisma appointment review maintenance repository", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("queries only active booking tenants and the exact grace-time window", async () => {
        const activationCutoff = new Date("2030-01-01T08:00:00.000Z");
        const eligibleThrough = new Date("2030-01-01T10:00:00.000Z");
        const findMany = jest.spyOn(prisma.appointment, "findMany");
        findMany.mockResolvedValue([
            {
                id: "appointment-1",
                tenantId: "tenant-1",
                status: AppointmentStatus.IN_PROGRESS,
                endTime: eligibleThrough,
                tenant: {
                    config: {
                        settings: { timezone: "America/Sao_Paulo" },
                    },
                },
            },
        ] as never);

        const result = await new PrismaAppointmentRepository().findReviewCandidates(
            {
                activationCutoff,
                eligibleThrough,
                limit: 25,
            },
        );

        expect(findMany).toHaveBeenCalledWith({
            where: {
                tenant: {
                    is: {
                        active: true,
                        type: { in: ["BOOKING", "HYBRID"] },
                    },
                },
                status: {
                    in: ["PENDING", "CONFIRMED", "IN_PROGRESS"],
                },
                startTime: { gte: activationCutoff },
                endTime: { lte: eligibleThrough },
            },
            select: {
                id: true,
                tenantId: true,
                status: true,
                endTime: true,
                tenant: { select: { config: true } },
            },
            orderBy: { endTime: "asc" },
            take: 25,
        });
        expect(result[0].tenantTimezone).toBe("America/Sao_Paulo");
    });

    test("uses UTC observability when tenant timezone data is missing or invalid", () => {
        expect(getTimezoneOrUtc(null)).toBe("UTC");
        expect(getTimezoneOrUtc("Invalid/Timezone")).toBe("UTC");
    });

    test("writes NEEDS_REVIEW only through the status and time-window guards", async () => {
        const updateMany = jest.spyOn(prisma.appointment, "updateMany");
        updateMany.mockResolvedValueOnce({ count: 1 });
        const activationCutoff = new Date("2030-01-01T08:00:00.000Z");
        const eligibleThrough = new Date("2030-01-01T10:00:00.000Z");
        const changedAt = new Date("2030-01-01T13:00:00.000Z");
        const repository = new PrismaAppointmentRepository();

        await expect(
            repository.markNeedsReview(
                "tenant-1",
                "appointment-1",
                AppointmentStatus.CONFIRMED,
                activationCutoff,
                eligibleThrough,
                changedAt,
                APPOINTMENT_REVIEW_SYSTEM_REASON,
            ),
        ).resolves.toBe(true);
        expect(updateMany).toHaveBeenCalledWith({
            where: {
                id: "appointment-1",
                tenantId: "tenant-1",
                status: AppointmentStatus.CONFIRMED,
                startTime: { gte: activationCutoff },
                endTime: { lte: eligibleThrough },
            },
            data: {
                status: AppointmentStatus.NEEDS_REVIEW,
                statusChangedAt: changedAt,
                statusChangeReason: APPOINTMENT_REVIEW_SYSTEM_REASON,
                statusChangedById: null,
            },
        });

        updateMany.mockResolvedValueOnce({ count: 0 });
        await expect(
            repository.markNeedsReview(
                "tenant-1",
                "appointment-1",
                AppointmentStatus.CONFIRMED,
                activationCutoff,
                eligibleThrough,
                changedAt,
                APPOINTMENT_REVIEW_SYSTEM_REASON,
            ),
        ).resolves.toBe(false);
    });
});
