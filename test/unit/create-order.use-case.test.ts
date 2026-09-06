// Covers the transactional order creation flow (stock/coupon delegated to repo)
import { CreateOrderUseCase } from "@/core/application/order/create-order.use-case";
import { BusinessRuleViolationError, EntityNotFoundError } from "@/core/domain/errors/domain-errors";

const CART_ITEM = {
    id: "p1",
    name: "Product 1",
    price: 10,
    image: "",
    description: "",
    stock: 5,
    amount: 2,
};

function setup(cartData: unknown = [CART_ITEM]) {
    const orderRepository = {
        create: jest.fn(),
        createWithInventoryAdjustment: jest
            .fn()
            .mockResolvedValue({ id: "order-1", items: [] }),
    };
    const getCartUseCase = { execute: jest.fn().mockResolvedValue({ success: true, data: cartData }) };
    const clearCartUseCase = { execute: jest.fn().mockResolvedValue(undefined) };
    const userRepository = { findById: jest.fn().mockResolvedValue(null) };
    const emailService = { sendOrderConfirmation: jest.fn().mockResolvedValue(undefined) };
    const featureRepository = { getTenantFeatureStatus: jest.fn().mockResolvedValue({}) };
    const configProvider = { getSmtpFrom: jest.fn().mockReturnValue("no-reply@test"), getFrontendUrl: jest.fn().mockReturnValue("http://localhost") };
    const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };

    const useCase = new CreateOrderUseCase(
        orderRepository as never,
        getCartUseCase as never,
        clearCartUseCase as never,
        userRepository as never,
        emailService as never,
        featureRepository as never,
        configProvider as never,
        logger as never,
    );
    return { useCase, orderRepository, getCartUseCase, clearCartUseCase, logger, emailService };
}

describe("CreateOrderUseCase", () => {
    test("creates order via transactional repo with mapped items and coupon", async () => {
        const { useCase, orderRepository, clearCartUseCase } = setup();

        const result = await useCase.execute("t1", "u1", "coupon-1");

        expect(orderRepository.createWithInventoryAdjustment).toHaveBeenCalledWith(
            "t1",
            expect.objectContaining({
                userId: "u1",
                couponId: "coupon-1",
                items: [{ productId: "p1", amount: 2, price: 10 }],
            }),
            [{ productId: "p1", amount: 2 }],
            "coupon-1",
        );
        expect(clearCartUseCase.execute).toHaveBeenCalledWith("t1", "u1");
        expect(result.success).toBe(true);
    });

    test("rejects empty cart", async () => {
        const { useCase } = setup([]);
        await expect(useCase.execute("t1", "u1")).rejects.toThrow(
            BusinessRuleViolationError,
        );
    });

    test("rejects when cart does not exist", async () => {
        const { useCase, getCartUseCase } = setup();
        getCartUseCase.execute.mockRejectedValue(
            new EntityNotFoundError("Cart", "u1"),
        );
        await expect(useCase.execute("t1", "u1")).rejects.toThrow(
            BusinessRuleViolationError,
        );
    });

    test("email failure is logged but does not break the order", async () => {
        const { useCase, emailService, logger } = setup();
        emailService.sendOrderConfirmation.mockRejectedValue(new Error("smtp down"));
        // enable EMAIL_NOTIFICATIONS so the send path is exercised
        type FeatureRepo = { getTenantFeatureStatus: (f: Record<string, boolean>) => Promise<unknown> };
        const featureRepo = (useCase as unknown as { featureRepository: FeatureRepo }).featureRepository;
        (featureRepo.getTenantFeatureStatus as jest.Mock).mockResolvedValue({ EMAIL_NOTIFICATIONS: true });
        type UserRepo = { findById: (id: string) => Promise<unknown> };
        const userRepo = (useCase as unknown as { userRepository: UserRepo }).userRepository;
        (userRepo.findById as jest.Mock).mockResolvedValue({ id: "u1", email: "a@b.com" });

        const result = await useCase.execute("t1", "u1");

        expect(result.success).toBe(true);
        await new Promise((r) => setImmediate(r)); // let the fire-and-forget reject
        expect(logger.error).toHaveBeenCalled();
    });
});
