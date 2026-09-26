import {
    Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import {
    canTransitionAppointmentStatus,
} from "@/core/domain/appointment/appointment.policy";
import { UpdateAppointmentStatusUseCase } from "@/core/application/booking/update-appointment-status.use-case";
import { CancelAppointmentUseCase } from "@/core/application/booking/cancel-appointment.use-case";
import { DeleteAppointmentUseCase } from "@/core/application/booking/delete-appointment.use-case";
import { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";
import { prisma } from "@/config/db.config";
import { AuthenticatedUser } from "@/types/rbac";
import { APPOINTMENT_OPERATIONAL_ROLES } from "@/middleware/authorization.middleware";
import {
    hasAnyRole,
    hasPermission,
} from "@/core/domain/rbac/access-policy";

const manager = {
    id: "staff-1",
    canManage: true,
    canDelete: true,
};
const customer = {
    id: "customer-1",
    canManage: false,
    canDelete: false,
};

function appointment(
    status: AppointmentStatus,
    userId = customer.id,
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

function statusUseCase(currentStatus: AppointmentStatus) {
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

    return { useCase, appointmentRepository, featureRepository };
}

function cancelUseCase(currentStatus: AppointmentStatus, userId = customer.id) {
    const appointmentRepository = {
        findById: jest
            .fn()
            .mockResolvedValue(appointment(currentStatus, userId)),
        updateStatus: jest.fn(),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue({}),
    };
    const useCase = new CancelAppointmentUseCase(
        appointmentRepository as unknown as IAppointmentRepository,
        featureRepository as never,
        { enqueue: jest.fn() } as never,
    );

    return { useCase, appointmentRepository };
}

describe("appointment transition policy", () => {
    test.each([
        [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED],
        [AppointmentStatus.PENDING, AppointmentStatus.CANCELLED],
        [AppointmentStatus.CONFIRMED, AppointmentStatus.IN_PROGRESS],
        [AppointmentStatus.CONFIRMED, AppointmentStatus.CANCELLED],
        [AppointmentStatus.IN_PROGRESS, AppointmentStatus.COMPLETED],
        [AppointmentStatus.NEEDS_REVIEW, AppointmentStatus.COMPLETED],
        [AppointmentStatus.NEEDS_REVIEW, AppointmentStatus.NO_SHOW],
        [AppointmentStatus.NEEDS_REVIEW, AppointmentStatus.CANCELLED],
    ])("allows %s -> %s", (currentStatus, nextStatus) => {
        expect(canTransitionAppointmentStatus(currentStatus, nextStatus)).toBe(
            true,
        );
    });

    test.each([
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.IN_PROGRESS,
    ])("does not expose %s -> NEEDS_REVIEW as a public mutation", (status) => {
        expect(
            canTransitionAppointmentStatus(
                status,
                AppointmentStatus.NEEDS_REVIEW,
            ),
        ).toBe(false);
    });

    test.each([
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    ])("keeps %s terminal", (terminalStatus) => {
        for (const status of Object.values(AppointmentStatus)) {
            expect(canTransitionAppointmentStatus(terminalStatus, status)).toBe(
                false,
            );
        }
    });
});

describe("UpdateAppointmentStatusUseCase", () => {
    test("rejects an unknown status before repository access", async () => {
        const { useCase, appointmentRepository } = statusUseCase(
            AppointmentStatus.CONFIRMED,
        );

        await expect(
            useCase.execute("tenant-1", "appointment-1", "UNKNOWN", manager),
        ).rejects.toMatchObject({ code: "INVALID_APPOINTMENT_STATUS" });
        expect(appointmentRepository.findById).not.toHaveBeenCalled();
        expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    test("allows CONFIRMED -> IN_PROGRESS with an expected-state write", async () => {
        const { useCase, appointmentRepository } = statusUseCase(
            AppointmentStatus.CONFIRMED,
        );
        const updated = appointment(
            AppointmentStatus.IN_PROGRESS,
        );
        appointmentRepository.updateStatus.mockResolvedValue(updated);

        const result = await useCase.execute(
            "tenant-1",
            "appointment-1",
            AppointmentStatus.IN_PROGRESS,
            manager,
            "Appointment started",
        );

        expect(result.success).toBe(true);
        expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.CONFIRMED,
                status: AppointmentStatus.IN_PROGRESS,
                reason: "Appointment started",
                actorId: manager.id,
            },
        );
    });

    test("rejects every transition out of terminal NO_SHOW", async () => {
        const { useCase, appointmentRepository } = statusUseCase(
            AppointmentStatus.NO_SHOW,
        );

        await expect(
            useCase.execute(
                "tenant-1",
                "appointment-1",
                AppointmentStatus.COMPLETED,
                manager,
            ),
        ).rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION" });
        expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    test("reports a conflict when the expected state was changed", async () => {
        const { useCase, appointmentRepository, featureRepository } =
            statusUseCase(AppointmentStatus.CONFIRMED);
        appointmentRepository.updateStatus.mockResolvedValue(null);

        await expect(
            useCase.execute(
                "tenant-1",
                "appointment-1",
                AppointmentStatus.IN_PROGRESS,
                manager,
            ),
        ).rejects.toMatchObject({ code: "APPOINTMENT_STATUS_CONFLICT" });
        expect(featureRepository.getTenantFeatureStatus).not.toHaveBeenCalled();
    });
});

describe("PrismaAppointmentRepository status CAS", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("returns the state read inside the guarded transaction", async () => {
        const updateMany = jest.spyOn(prisma.appointment, "updateMany");
        updateMany.mockResolvedValue({ count: 1 });
        const findFirst = jest.spyOn(prisma.appointment, "findFirst");
        findFirst.mockResolvedValue(
            appointment(AppointmentStatus.IN_PROGRESS) as never,
        );
        const transaction = jest.spyOn(prisma, "$transaction") as unknown as jest.Mock;
        transaction.mockImplementation(
            (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );

        const result = await new PrismaAppointmentRepository().updateStatus(
            "tenant-1",
            "appointment-1",
            {
                expectedStatus: AppointmentStatus.CONFIRMED,
                status: AppointmentStatus.IN_PROGRESS,
                reason: "Appointment started",
                actorId: manager.id,
            },
        );

        expect(transaction).toHaveBeenCalledTimes(1);
        expect(updateMany).toHaveBeenCalledWith({
            where: {
                id: "appointment-1",
                tenantId: "tenant-1",
                status: AppointmentStatus.CONFIRMED,
            },
            data: expect.objectContaining({
                status: AppointmentStatus.IN_PROGRESS,
                statusChangeReason: "Appointment started",
                statusChangedById: manager.id,
            }),
        });
        expect(findFirst).toHaveBeenCalledWith({
            where: {
                id: "appointment-1",
                tenantId: "tenant-1",
                status: AppointmentStatus.IN_PROGRESS,
            },
            include: { coupon: true },
        });
        expect(result?.status).toBe(AppointmentStatus.IN_PROGRESS);
    });
});

describe("appointment mutation authorization", () => {
    test.each([
        AppointmentStatus.PENDING,
        AppointmentStatus.CONFIRMED,
    ])(
        "preserves customer self-cancellation for %s appointments",
        async (status) => {
            const { useCase, appointmentRepository } = cancelUseCase(status);
            appointmentRepository.updateStatus.mockResolvedValue(
                appointment(AppointmentStatus.CANCELLED),
            );

            const result = await useCase.execute(
                "tenant-1",
                "appointment-1",
                customer,
                "Plans changed",
            );

            expect(result.success).toBe(true);
            expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
                "tenant-1",
                "appointment-1",
                {
                    expectedStatus: status,
                    status: AppointmentStatus.CANCELLED,
                    reason: "Plans changed",
                    actorId: customer.id,
                    cancellationReason: "Plans changed",
                },
            );
        },
    );

    test("rejects cancellation of another customer's appointment", async () => {
        const { useCase, appointmentRepository } = cancelUseCase(
            AppointmentStatus.PENDING,
        );

        await expect(
            useCase.execute("tenant-1", "appointment-1", {
                ...customer,
                id: "other-customer",
            }),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    test("allows an operational actor to cancel an appointment needing review", async () => {
        const { useCase, appointmentRepository } = cancelUseCase(
            AppointmentStatus.NEEDS_REVIEW,
        );
        appointmentRepository.updateStatus.mockResolvedValue(
            appointment(AppointmentStatus.CANCELLED),
        );

        const result = await useCase.execute(
            "tenant-1",
            "appointment-1",
            manager,
            "Resolved manually",
        );

        expect(result.success).toBe(true);
        expect(appointmentRepository.updateStatus).toHaveBeenCalledWith(
            "tenant-1",
            "appointment-1",
            expect.objectContaining({
                expectedStatus: AppointmentStatus.NEEDS_REVIEW,
                status: AppointmentStatus.CANCELLED,
                actorId: manager.id,
            }),
        );
    });

    test("does not let a customer cancel an appointment needing review", async () => {
        const { useCase, appointmentRepository } = cancelUseCase(
            AppointmentStatus.NEEDS_REVIEW,
        );

        await expect(
            useCase.execute("tenant-1", "appointment-1", customer),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(appointmentRepository.updateStatus).not.toHaveBeenCalled();
    });

    test("does not treat a customer write permission as operational access", () => {
        const user: AuthenticatedUser = {
            id: customer.id,
            email: "customer@example.com",
            name: "Customer",
            role: {
                id: "role-user",
                name: "USER",
                level: 1,
                permissions: ["appointments:write"],
            },
        };

        expect(hasPermission(user, "appointments:write")).toBe(true);
        expect(hasAnyRole(user, APPOINTMENT_OPERATIONAL_ROLES)).toBe(false);
    });

    test("rejects delete without operational permission before repository access", async () => {
        const appointmentRepository = { findById: jest.fn() };
        const useCase = new DeleteAppointmentUseCase(
            appointmentRepository as unknown as IAppointmentRepository,
        );

        await expect(
            useCase.execute("tenant-1", "appointment-1", customer),
        ).rejects.toMatchObject({ code: "FORBIDDEN" });
        expect(appointmentRepository.findById).not.toHaveBeenCalled();
    });
});
