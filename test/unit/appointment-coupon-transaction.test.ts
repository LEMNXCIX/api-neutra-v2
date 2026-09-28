import { prisma } from "@/config/db.config";
import { PrismaAppointmentRepository } from "@/infrastructure/database/prisma/appointment.prisma-repository";
import { BusinessErrorCodes } from "@/types/error-codes";

function couponRow(overrides: Record<string, unknown> = {}) {
    return {
        id: "coupon-1",
        code: "REWARD-1",
        type: "PERCENT",
        value: 10,
        description: null,
        minPurchaseAmount: null,
        maxDiscountAmount: null,
        usageLimit: 1,
        usageCount: 0,
        active: true,
        expiresAt: new Date("2999-01-01"),
        tenantId: "tenant-1",
        ownerId: "customer-1",
        isReward: true,
        isLoyaltyTemplate: false,
        sourceCouponId: "template-1",
        applicableProducts: [],
        applicableCategories: [],
        applicableServices: ["service-1"],
        createdAt: new Date("2020-01-01"),
        updatedAt: new Date("2020-01-02"),
        ...overrides,
    } as never;
}

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
        discountAmount: 1,
        subtotal: 50,
        total: 49,
        ...overrides,
    } as never;
}

function mockService() {
    jest.spyOn(prisma.service, "findUnique").mockResolvedValue({
        duration: 30,
    } as never);
    jest.spyOn(prisma.service, "findFirst").mockResolvedValue({
        price: 100,
    } as never);
}

function mockCouponsFeature(enabled = true) {
    return jest
        .spyOn(prisma.tenantFeature, "findFirst")
        .mockResolvedValue(enabled ? ({ id: "feature-1" } as never) : null);
}

function passTransaction(couponsEnabled = true) {
    jest.spyOn(prisma, "$transaction").mockImplementation(
        async (callback: (tx: typeof prisma) => Promise<unknown>) =>
            callback(prisma),
    );
    mockCouponsFeature(couponsEnabled);
}

describe("Prisma appointment coupon transaction", () => {
    afterEach(() => {
        jest.restoreAllMocks();
    });

    test("revalidates and recalculates a personal service reward atomically", async () => {
        let inTransaction = false;
        mockCouponsFeature();
        jest.spyOn(prisma, "$transaction").mockImplementation(
            async (callback: (tx: typeof prisma) => Promise<unknown>) => {
                inTransaction = true;
                try {
                    return await callback(prisma);
                } finally {
                    inTransaction = false;
                }
            },
        );
        mockService();
        const coupon = couponRow();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(coupon);
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

        expect(prisma.coupon.findFirst).toHaveBeenCalledWith({
            where: { id: "coupon-1", tenantId: "tenant-1" },
        });
        expect(usage).toHaveBeenCalledWith({
            where: expect.objectContaining({
                id: "coupon-1",
                tenantId: "tenant-1",
                usageCount: 0,
                usageLimit: 1,
                updatedAt: expect.any(Date),
                active: true,
                expiresAt: { gt: expect.any(Date) },
                isLoyaltyTemplate: false,
                ownerId: "customer-1",
                isReward: true,
            }),
            data: { usageCount: { increment: 1 } },
        });
        expect(create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    couponId: "coupon-1",
                    subtotal: 100,
                    discountAmount: 10,
                    total: 90,
                }),
            }),
        );
    });

    test("rolls back when COUPONS is disabled before consumption", async () => {
        passTransaction(false);
        mockService();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.appointment, "create");

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).rejects.toMatchObject({
            code: BusinessErrorCodes.COUPONS_FEATURE_REQUIRED,
        });
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("allows a hybrid coupon whose service side matches", async () => {
        passTransaction();
        mockService();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow({ applicableProducts: ["product-1"] }) as never,
        );
        jest.spyOn(prisma.coupon, "updateMany").mockResolvedValue({
            count: 1,
        } as never);
        jest.spyOn(prisma.appointment, "create").mockResolvedValue(
            appointmentRow(),
        );

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).resolves.toEqual(expect.objectContaining({ id: "appointment-1" }));
    });

    test.each([
        ["deactivated", { active: false }, "Coupon is not active"],
        [
            "expired",
            { expiresAt: new Date("2000-01-01") },
            "Coupon has expired",
        ],
        [
            "usage limit reached",
            { usageLimit: 1, usageCount: 1 },
            "Coupon usage limit reached",
        ],
        [
            "service mismatch",
            { applicableServices: ["service-2"] },
            "Coupon not applicable to this service",
        ],
        [
            "product-only",
            { applicableServices: [], applicableProducts: ["product-1"] },
            "Coupon is only applicable to products",
        ],
        [
            "category-only",
            { applicableServices: [], applicableCategories: ["category-1"] },
            "Coupon is only applicable to products",
        ],
        [
            "loyalty template",
            { isLoyaltyTemplate: true },
            "Loyalty reward templates cannot be redeemed",
        ],
    ])(
        "rejects a transaction-time %s coupon before usage or appointment writes",
        async (_, overrides, message) => {
            passTransaction();
            mockService();
            jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
                couponRow(overrides) as never,
            );
            const usage = jest.spyOn(prisma.coupon, "updateMany");
            const create = jest.spyOn(prisma.appointment, "create");

            await expect(
                new PrismaAppointmentRepository().create("tenant-1", data()),
            ).rejects.toThrow(message);
            expect(usage).not.toHaveBeenCalled();
            expect(create).not.toHaveBeenCalled();
        },
    );

    test("rejects a coupon reloaded for another owner", async () => {
        passTransaction();
        mockService();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow({ ownerId: "customer-2" }) as never,
        );
        const usage = jest.spyOn(prisma.coupon, "updateMany");
        const create = jest.spyOn(prisma.appointment, "create");

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).rejects.toMatchObject({ code: BusinessErrorCodes.COUPON_NOT_OWNED });
        expect(usage).not.toHaveBeenCalled();
        expect(create).not.toHaveBeenCalled();
    });

    test("does not create an appointment when the compare-and-set loses", async () => {
        passTransaction();
        mockService();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
        jest.spyOn(prisma.coupon, "updateMany").mockResolvedValue({
            count: 0,
        } as never);
        const create = jest.spyOn(prisma.appointment, "create");

        await expect(
            new PrismaAppointmentRepository().create("tenant-1", data()),
        ).rejects.toMatchObject({
            code: BusinessErrorCodes.COUPON_UNAVAILABLE,
        });
        expect(create).not.toHaveBeenCalled();
    });

    test("rolls back coupon usage when appointment creation fails", async () => {
        const error = new Error("appointment write failed");
        mockCouponsFeature();
        let usageCount = 0;
        let appointmentCreated = false;
        jest.spyOn(prisma, "$transaction").mockImplementation(
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
        mockService();
        jest.spyOn(prisma.coupon, "findFirst").mockResolvedValue(
            couponRow() as never,
        );
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
