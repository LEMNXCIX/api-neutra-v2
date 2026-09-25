import { CreateAppointmentUseCase } from "@/core/application/booking/create-appointment.use-case";

describe("appointment reward coupon ownership wiring", () => {
    test("passes the appointment customer identity to validation and usage", async () => {
        const appointmentRepository = {
            checkAvailability: jest.fn().mockResolvedValue(true),
            create: jest.fn().mockResolvedValue({ id: "appointment-1" }),
        };
        const staffRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "staff-1",
                active: true,
                workingHours: undefined,
            }),
            getServices: jest.fn().mockResolvedValue(["service-1"]),
        };
        const serviceRepository = {
            findById: jest.fn().mockResolvedValue({
                id: "service-1",
                active: true,
                duration: 30,
                price: 100,
            }),
        };
        const couponRepository = {
            incrementUsage: jest.fn(),
        };
        const validateCouponUseCase = {
            execute: jest.fn().mockResolvedValue({
                success: true,
                message: "Coupon is valid",
                data: {
                    valid: true,
                    coupon: { id: "coupon-1" },
                    discountAmount: 10,
                },
            }),
        };
        const useCase = new CreateAppointmentUseCase(
            appointmentRepository as never,
            staffRepository as never,
            serviceRepository as never,
            couponRepository as never,
            validateCouponUseCase as never,
            { enqueue: jest.fn() } as never,
            {
                getTenantFeatureStatus: jest.fn().mockResolvedValue({}),
            } as never,
        );

        await useCase.execute("tenant-1", {
            userId: "customer-1",
            serviceId: "service-1",
            staffId: "staff-1",
            startTime: new Date("2099-01-01T10:00:00.000Z"),
            couponCode: "REWARD-1",
        });

        expect(validateCouponUseCase.execute).toHaveBeenCalledWith(
            "tenant-1",
            {
                code: "REWARD-1",
                orderTotal: 100,
                serviceIds: ["service-1"],
            },
            "customer-1",
        );
        expect(couponRepository.incrementUsage).not.toHaveBeenCalled();
        expect(appointmentRepository.create).toHaveBeenCalledWith(
            "tenant-1",
            expect.objectContaining({
                couponId: "coupon-1",
                discountAmount: 10,
                subtotal: 100,
                total: 90,
            }),
        );
    });
});
