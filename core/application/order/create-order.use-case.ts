import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { GetCartUseCase } from "@/core/application/cart/get-cart.use-case";
import { ClearCartUseCase } from "@/core/application/cart/clear-cart.use-case";
import { CreateOrderDTO } from "@/core/application/dtos/requests/order.request";
import { BusinessRuleViolationError } from "@/core/domain/errors/domain-errors";
import { IProductRepository } from "@/core/repositories/product.repository.interface";
import { ICouponRepository } from "@/core/repositories/coupon.repository.interface";
import { IEmailService } from "@/core/ports/email.port";
import { IUserRepository } from "@/core/repositories/user.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { IFeatureRepository } from "@/core/repositories/feature.repository.interface";
import { IConfigProvider } from "@/core/providers/config-provider.interface";
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
        private productRepository: IProductRepository,
        private couponRepository: ICouponRepository,
        private userRepository: IUserRepository,
        private emailService: IEmailService,
        private featureRepository: IFeatureRepository,
        private configProvider: IConfigProvider,
    ) {}

    async execute(
        tenantId: string,
        userId: string,
        couponId?: string,
    ): Promise<UseCaseResult> {
        let cartResponse;
        try {
            cartResponse = await this.getCartUseCase.execute(tenantId, userId);
        } catch (error: unknown) {
            if (
                error instanceof Error &&
                "statusCode" in error &&
                (error as { statusCode: number }).statusCode === 404
            ) {
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

        const orderData: CreateOrderDTO = {
            userId,
            items: cartItems.map((item: CartProductItem) => ({
                productId: item.id,
                amount: item.amount,
                price: parseFloat(String(item.price)),
            })),
            couponId,
        };

        const order = await this.orderRepository.create(tenantId, orderData);

        if (couponId) {
            await this.couponRepository.incrementUsage(tenantId, couponId);
        }

        for (const item of cartItems) {
            const product = await this.productRepository.findById(
                tenantId,
                item.id,
            );
            if (product) {
                const newStock = product.stock - item.amount;
                await this.productRepository.update(tenantId, item.id, {
                    stock: newStock,
                });
            }
        }

        await this.clearCartUseCase.execute(tenantId, userId);

        this.sendOrderConfirmation(tenantId, userId, order).catch(() => {});

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
