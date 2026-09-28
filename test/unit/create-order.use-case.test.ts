import type { CreateOrderDTO } from "@/core/application/dtos/requests/order.request";
import { CreateOrderUseCase } from "@/core/application/order/create-order.use-case";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";
import { OrderController } from "@/interface-adapters/controllers/order.controller";
import { BusinessErrorCodes } from "@/types/error-codes";

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
    const getCartUseCase = {
        execute: jest.fn().mockResolvedValue({ success: true, data: cartData }),
    };
    const clearCartUseCase = {
        execute: jest.fn().mockResolvedValue(undefined),
    };
    const validateCouponUseCase = {
        execute: jest.fn().mockResolvedValue({
            success: true,
            message: "Coupon is valid",
            data: {
                valid: true,
                coupon: { id: "coupon-validated" },
                discountAmount: 2,
            },
        }),
    };
    const productRepository = {
        findById: jest.fn().mockResolvedValue({
            id: "p1",
            categories: [{ id: "category-1" }],
        }),
    };
    const userRepository = {
        findById: jest.fn().mockResolvedValue(null),
    };
    const emailService = {
        sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    };
    const featureRepository = {
        getTenantFeatureStatus: jest.fn().mockResolvedValue({ COUPONS: true }),
    };
    const configProvider = {
        getSmtpFrom: jest.fn().mockReturnValue("no-reply@test"),
        getFrontendUrl: jest.fn().mockReturnValue("http://localhost"),
    };
    const logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };

    const useCase = new CreateOrderUseCase(
        orderRepository as never,
        getCartUseCase as never,
        clearCartUseCase as never,
        validateCouponUseCase as never,
        productRepository as never,
        userRepository as never,
        emailService as never,
        featureRepository as never,
        configProvider as never,
        logger as never,
    );
    return {
        useCase,
        orderRepository,
        getCartUseCase,
        clearCartUseCase,
        validateCouponUseCase,
        productRepository,
        userRepository,
        emailService,
        featureRepository,
        logger,
    };
}

describe("CreateOrderUseCase", () => {
    test("validates a coupon code with cart data and persists only its identity", async () => {
        const {
            useCase,
            orderRepository,
            clearCartUseCase,
            validateCouponUseCase,
            productRepository,
            featureRepository,
        } = setup();

        const result = await useCase.execute("t1", "u1", "STORE-10");

        expect(featureRepository.getTenantFeatureStatus).toHaveBeenCalledWith(
            "t1",
        );
        expect(productRepository.findById).toHaveBeenCalledWith("t1", "p1");
        expect(validateCouponUseCase.execute).toHaveBeenCalledWith(
            "t1",
            {
                code: "STORE-10",
                orderTotal: 20,
                productIds: ["p1"],
                categoryIds: ["category-1"],
            },
            "u1",
        );
        expect(
            orderRepository.createWithInventoryAdjustment,
        ).toHaveBeenCalledWith(
            "t1",
            {
                userId: "u1",
                couponId: "coupon-validated",
                items: [{ productId: "p1", amount: 2, price: 10 }],
            },
            [{ productId: "p1", amount: 2 }],
        );
        expect(clearCartUseCase.execute).toHaveBeenCalledWith("t1", "u1");
        expect(result.success).toBe(true);
    });

    test("requires the coupons feature before validating a supplied code", async () => {
        const {
            useCase,
            orderRepository,
            validateCouponUseCase,
            featureRepository,
        } = setup();
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            COUPONS: false,
        });

        await expect(
            useCase.execute("t1", "u1", "STORE-10"),
        ).rejects.toMatchObject({
            code: BusinessErrorCodes.COUPONS_FEATURE_REQUIRED,
        });
        expect(validateCouponUseCase.execute).not.toHaveBeenCalled();
        expect(
            orderRepository.createWithInventoryAdjustment,
        ).not.toHaveBeenCalled();
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
        const {
            useCase,
            emailService,
            featureRepository,
            userRepository,
            logger,
        } = setup();
        emailService.sendOrderConfirmation.mockRejectedValue(
            new Error("smtp down"),
        );
        featureRepository.getTenantFeatureStatus.mockResolvedValue({
            EMAIL_NOTIFICATIONS: true,
        });
        userRepository.findById.mockResolvedValue({
            id: "u1",
            email: "a@b.com",
        });

        const result = await useCase.execute("t1", "u1");

        expect(result.success).toBe(true);
        await new Promise((resolve) => setImmediate(resolve));
        expect(logger.error).toHaveBeenCalled();
    });
});

describe("OrderController coupon identity", () => {
    test("forwards couponCode and ignores an arbitrary coupon ID", async () => {
        const createOrderUseCase = {
            execute: jest
                .fn()
                .mockResolvedValue({ success: true, message: "ok" }),
        };
        const controller = new OrderController(
            createOrderUseCase as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
        );
        const requestBody: Pick<CreateOrderDTO, "couponCode"> = {
            couponCode: "STORE-10",
        };
        const req = {
            tenantId: "t1",
            user: { id: "u1" },
            body: { ...requestBody, couponId: "forged-id" },
        } as never;
        const json = jest.fn();
        const res = { status: jest.fn().mockReturnValue({ json }) } as never;

        await controller.create(req, res);

        expect(createOrderUseCase.execute).toHaveBeenCalledWith(
            "t1",
            "u1",
            "STORE-10",
        );
    });
});
