jest.mock("uuid", () => ({ v4: () => "test-uuid" }));

import { GetAppointmentsNeedingReviewUseCase } from "@/core/application/booking/get-appointments-needing-review.use-case";
import { AppointmentResponse } from "@/core/application/dtos/responses/appointment/appointment.response";
import { AppointmentListResponse } from "@/core/application/dtos/responses/appointment/appointment-list.response";
import {
    type Appointment,
    AppointmentStatus,
} from "@/core/entities/appointment.entity";
import type { IAppointmentRepository } from "@/core/repositories/appointment.repository.interface";
import { AppointmentController } from "@/interface-adapters/controllers/appointment.controller";

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
    return {
        id: "appointment-1",
        userId: "user-1",
        serviceId: "service-1",
        staffId: "staff-1",
        startTime: new Date("2030-01-01T10:00:00.000Z"),
        endTime: new Date("2030-01-01T11:00:00.000Z"),
        status: AppointmentStatus.NEEDS_REVIEW,
        statusChangedAt: new Date("2030-01-01T13:00:00.000Z"),
        statusChangeReason: "Outcome unresolved after grace period",
        statusChangedById: null,
        notes: "Customer requested a callback",
        cancellationReason: null,
        couponId: null,
        confirmationSent: true,
        reminderSent: false,
        tenantId: "tenant-1",
        createdAt: new Date("2030-01-01T09:00:00.000Z"),
        updatedAt: new Date("2030-01-01T13:00:00.000Z"),
        discountAmount: 0,
        subtotal: 25,
        total: 25,
        ...overrides,
    };
}

describe("GetAppointmentsNeedingReviewUseCase", () => {
    test("returns a tenant-scoped paginated NEEDS_REVIEW queue", async () => {
        const appointments = [makeAppointment()];
        const repository = {
            findAllPaginated: jest.fn().mockResolvedValue({
                appointments,
                total: 11,
            }),
        };
        const useCase = new GetAppointmentsNeedingReviewUseCase(
            repository as unknown as IAppointmentRepository,
        );

        const result = await useCase.execute("tenant-1", 2, 5);

        expect(repository.findAllPaginated).toHaveBeenCalledWith(
            "tenant-1",
            { status: AppointmentStatus.NEEDS_REVIEW },
            2,
            5,
        );
        expect(result).toMatchObject({
            success: true,
            data: appointments,
            meta: {
                pagination: {
                    page: 2,
                    limit: 5,
                    total: 11,
                    totalPages: 3,
                },
            },
        });
    });

    test("uses the first page and default limit when omitted", async () => {
        const repository = {
            findAllPaginated: jest.fn().mockResolvedValue({
                appointments: [],
                total: 0,
            }),
        };
        const useCase = new GetAppointmentsNeedingReviewUseCase(
            repository as unknown as IAppointmentRepository,
        );

        await useCase.execute("tenant-1");

        expect(repository.findAllPaginated).toHaveBeenCalledWith(
            "tenant-1",
            { status: AppointmentStatus.NEEDS_REVIEW },
            1,
            10,
        );
    });
});

describe("AppointmentController attention tenant scope", () => {
    test.each([
        ["missing", undefined],
        ["all", "all"],
    ])(
        "rejects %s tenant context before invoking the attention use case",
        async (_case, tenantId) => {
            const execute = jest.fn();
            const controller = new AppointmentController(
                undefined as never,
                undefined as never,
                { execute } as never,
                undefined as never,
                undefined as never,
                undefined as never,
                undefined as never,
                undefined as never,
            );

            await expect(
                controller.getAttention(
                    { tenantId, query: {} } as never,
                    {} as never,
                ),
            ).rejects.toMatchObject({
                statusCode: 400,
                code: "TENANT_REQUIRED",
            });
            expect(execute).not.toHaveBeenCalled();
        },
    );
});

describe("appointment status audit response mapping", () => {
    test("includes the owner id and status audit metadata in detail responses", () => {
        const appointment = makeAppointment({ statusChangedById: "staff-1" });

        expect(AppointmentResponse.fromEntity(appointment)).toEqual(
            expect.objectContaining({
                userId: appointment.userId,
                statusChangedAt: appointment.statusChangedAt,
                statusChangeReason: appointment.statusChangeReason,
                statusChangedById: "staff-1",
            }),
        );
    });

    test("includes the owner id and status audit metadata in list responses and nulls missing values", () => {
        const appointment = makeAppointment({
            statusChangedAt: undefined,
            statusChangeReason: undefined,
            statusChangedById: undefined,
        });

        expect(AppointmentListResponse.fromEntity(appointment)).toEqual(
            expect.objectContaining({
                userId: appointment.userId,
                statusChangedAt: null,
                statusChangeReason: null,
                statusChangedById: null,
            }),
        );
    });
});
