import { IOrderRepository, OrderCreateData } from "@/core/repositories/order.repository.interface";
import { GetCartUseCase } from "@/core/application/cart/get-cart.use-case";
import { ClearCartUseCase } from "@/core/application/cart/clear-cart.use-case";
import { ValidateCouponUseCase } from "@/core/application/coupons/validate-coupon.use-case";
import {
    BusinessRuleViolationError,
    EntityNotFoundError,
} from "@/core/domain/errors/domain-errors";
import { assertCouponsFeatureEnabled } from "@/core/domain/coupon/coupon.policy";
import { IEmailService } from "@/core/ports/email.port";
import { IProductRepository } from "@/core/repositories/product.repository.interface";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { IConfigProvider } from "@/core/providers/config-provider.interface";
import { ILogger } from "@/core/providers/logger.interface";
import { Order } from "@/core/entities/order.entity";

interface CartProductItem {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    stock: number;
    amount: number;
}

export class CreateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private getCartUseCase: GetCartUseCase,
        private clearCartUseCase: ClearCartUseCase,
        private validateCouponUseCase: ValidateCouponUseCase,
        private productRepository: IProductRepository,
        private userRepository: IUserRepository,
        private emailService: IEmailService,
        private featureRepository: IFeatureRepository,
        private configProvider: IConfigProvider,
        private logger: ILogger,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
        couponCode?: string,
    ): Promise<UseCaseResult> {
        let cartResponse;
        try {
            cartResponse = await this.getCartUseCase.execute(tenantId, userId);
        } catch (error: unknown) {
            if (error instanceof EntityNotFoundError) {
                throw new BusinessRuleViolationError(
                    "Tu carrito esta vacío, no puedes generar una orden.",
                    "CART_EMPTY",
                );
            }
            throw error;
        }

        if (
            !cartResponse.success ||
            !cartResponse.data ||
            (Array.isArray(cartResponse.data) && cartResponse.data.length === 0)
        ) {
            throw new BusinessRuleViolationError(
                "Tu carrito esta vacío, no puedes generar una orden.",
                "CART_EMPTY",
            );
        }

        const cartItems = cartResponse.data as CartProductItem[];
        let couponId: string | undefined;

        if (couponCode) {
            const features =
                await this.featureRepository.getTenantFeatureStatus(tenantId);
            assertCouponsFeatureEnabled(features["COUPONS"]);

            const products = await Promise.all(
                cartItems.map((item) =>
                    this.productRepository.findById(tenantId, item.id),
                ),
            );
            const missingProductIndex = products.findIndex(
                (product) => !product,
            );
            if (missingProductIndex >= 0) {
                throw new EntityNotFoundError(
                    "Product",
                    cartItems[missingProductIndex].id,
                );
            }

            const productIds = cartItems.map((item) => item.id);
            const categoryIds = [
                ...new Set(
                    products.flatMap(
                        (product) =>
                            product?.categories?.map(({ id }) => id) ?? [],
                    ),
                ),
            ];
            const subtotal = cartItems.reduce(
                (sum, item) =>
                    sum + parseFloat(String(item.price)) * item.amount,
                0,
            );
            const validationResult =
                await this.validateCouponUseCase.execute(
                    tenantId,
                    {
                        code: couponCode,
                        orderTotal: subtotal,
                        productIds,
                        categoryIds,
                    },
                    userId,
                );

            if (
                !validationResult.success ||
                !validationResult.data?.valid ||
                !validationResult.data.coupon
            ) {
                throw new BusinessRuleViolationError(
                    validationResult.message || "The provided coupon is invalid",
                    "INVALID_COUPON",
                );
            }
            couponId = validationResult.data.coupon.id;
        }

        const orderData: OrderCreateData = {
            userId,
            items: cartItems.map((item: CartProductItem) => ({
                productId: item.id,
                amount: item.amount,
                price: parseFloat(String(item.price)),
            })),
            couponId,
        };

        const order = await this.orderRepository.createWithInventoryAdjustment(
            tenantId,
            orderData,
            cartItems.map((item: CartProductItem) => ({
                productId: item.id,
                amount: item.amount,
            })),
        );

        await this.clearCartUseCase.execute(tenantId, userId);

        this.sendOrderConfirmation(tenantId, userId, order).catch(
            (error: unknown) => {
                this.logger.error(
                    "Failed to send order confirmation email",
                    error,
                    { tenantId, userId, orderId: order.id },
                );
            },
        );

        return Success(order, "Se ha generado su orden");
    }

    private async sendOrderConfirmation(
        tenantId: string,
        userId: string,
        order: Order,
    ): Promise<void> {
        const features =
            await this.featureRepository.getTenantFeatureStatus(tenantId);
        if (!features["EMAIL_NOTIFICATIONS"]) {
            return;
        }

        const user = await this.userRepository.findById(userId);
        if (!user || !user.email) {
            return;
        }

        await this.emailService.sendOrderConfirmation(user.email, order, {
            tenantName: "Neutra",
            supportEmail: this.configProvider.getSmtpFrom(),
            websiteUrl: this.configProvider.getFrontendUrl(),
            primaryColor: "#000000",
        });
    }
}
