import { prisma } from "@/config/db.config";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";

function appointmentRow() {
    return {
        id: "appointment-1",
        tenantId: "tenant-1",
        userId: "customer-1",
        serviceId: "service-1",
        staffId: "staff-1",
        startTime: new Date("2099-01-01T10:00:00.000Z"),
        endTime: new Date("2099-01-01T10:30:00.000Z"),
        status: "PENDING",
        statusChangedAt: new Date(),
        statusChangedById: "customer-1",
        notes: undefined,
        cancellationReason: undefined,
        confirmationSent: false,
        reminderSent: false,
        couponId: "coupon-1",
        discountAmount: 10,
        subtotal: 100,
        total: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
    } as never;
}

function data(overrides: Record<string, unknown> = {}) {
    return {
        userId: "customer-1",
        serviceId: "service-1",
        staffId: "staff-1",
        startTime: new Date("2099-01-01T10:00:00.000Z"),
        couponId: "coupon-1",
        discountAmount: 10,
        subtotal: 100,
        total: 90,
        ...overrides,
    } as never;
}

describe("Prisma appointment coupon transaction", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("increments a personal reward coupon and creates the appointment together", async () => {
        let inTransaction = false;
        const transaction = jest.spyOn(
            prisma,
            "$transaction",
        ) as unknown as jest.Mock;
        transaction.mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) => {
                inTransaction = true;
                try {
                    return await callback(prisma);
                } finally {
                    inTransaction = false;
                }
            },
        );
        jest.spyOn(prisma.service, "findUnique").mockResolvedValue({
            duration: 30,
        } as never);
        const usage = jest.spyOn(
            prisma.coupon,
            "updateMany",
        ) as unknown as jest.Mock;
        usage.mockImplementation(async () => {
            expect(inTransaction).toBe(true);
            return { count: 1 };
        });
        const create = jest.spyOn(
            prisma.appointment,
            "create",
        ) as unknown as jest.Mock;
        create.mockImplementation(async () => {
            expect(inTransaction).toBe(true);
            return appointmentRow();
        });

        await new PrismaAppointmentRepository().create("tenant-1", data());

        expect(usage).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "coupon-1",
                tenantId: "tenant-1",
                OR: expect.arrayContaining([
                    expect.objectContaining({
                        ownerId: "customer-1",
                        isReward: true,
                        usageCount: { lt: 1 },
                    }),
                ]),
            }),
            data: { usageCount: { increment: 1 } },
        });
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    couponId: "coupon-1",
                    discountAmount: 10,
                    subtotal: 100,
                    total: 90,
                }),
            }),
        );
    });

    test("does not create an appointment when the personal reward is already consumed", async () => {
        const transaction = jest.spyOn(
            prisma,
            "$transaction",
        ) as unknown as jest.Mock;
        transaction.mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) =>
                callback(prisma),
        );
        jest.spyOn(prisma.service, "findUnique").mockResolvedValue({
            duration: 30,
        } as never);
        jest.spyOn(prisma.coupon, "updateMany").mockResolvedValue({
            count: 0,
        } as never);
        const create = jest.spyOn(prisma.appointment, "create");

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).rejects.toMatchObject({ code: "COUPON_UNAVAILABLE" });
        expect(create).not.toHaveBeenCalled();
    });

    test("rolls back coupon usage when appointment creation fails", async () => {
        const error = new Error("appointment write failed");
        let usageCount = 0;
        let appointmentCreated = false;
        const transaction = jest.spyOn(
            prisma,
            "$transaction",
        ) as unknown as jest.Mock;
        transaction.mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) => {
                const usageBefore = usageCount;
                const appointmentBefore = appointmentCreated;
                try {
                    return await callback(prisma);
                } catch (caught) {
                    usageCount = usageBefore;
                    appointmentCreated = appointmentBefore;
                    throw caught;
                }
            },
        );
        jest.spyOn(prisma.service, "findUnique").mockResolvedValue({
            duration: 30,
        } as never);
        (
            jest.spyOn(prisma.coupon, "updateMany") as unknown as jest.Mock
        ).mockImplementation(async () => {
            usageCount += 1;
            return { count: 1 };
        });
        (
            jest.spyOn(prisma.appointment, "create") as unknown as jest.Mock
        ).mockImplementation(async () => {
            appointmentCreated = true;
            throw error;
        });

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).rejects.toBe(error);
        expect(usageCount).toBe(0);
        expect(appointmentCreated).toBe(false);
    });
});
