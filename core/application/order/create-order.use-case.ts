import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { GetCartUseCase } from '@/core/application/cart/get-cart.use-case';
import { ClearCartUseCase } from '@/core/application/cart/clear-cart.use-case';
import { CreateOrderDTO } from '@/core/entities/order.entity';
import { BusinessErrorCodes } from '@/types/error-codes';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';
import { IEmailService } from '@/core/ports/email.port';
import { IUserRepository } from '@/core/repositories/user.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { IFeatureRepository } from '@/core/repositories/feature.repository.interface';
import { AppError } from '@/types/api-response';

export class CreateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private getCartUseCase: GetCartUseCase,
        private clearCartUseCase: ClearCartUseCase,
        private productRepository: IProductRepository,
        private couponRepository: ICouponRepository,
        private userRepository: IUserRepository,
        private logger: ILogger,
        private emailService: IEmailService,
        private featureRepository: IFeatureRepository
    ) { }

    async execute(tenantId: string, userId: string, couponId?: string): Promise<UseCaseResult> {
        this.logger.info('CreateOrder - Executing', { userId, couponId });

        const cartResponse = await this.getCartUseCase.execute(tenantId, userId);

        if (!cartResponse.success || !cartResponse.data || (Array.isArray(cartResponse.data) && cartResponse.data.length === 0)) {
            this.logger.warn('CreateOrder - Cart is empty', { userId });
            throw new AppError('Tu carrito esta vacío, no puedes generar una orden.', 422, BusinessErrorCodes.CART_EMPTY);
        }

        const cartItems = cartResponse.data as any[];
        this.logger.info('CreateOrder - Cart items count', { count: cartItems.length });

        const orderData: CreateOrderDTO = {
            userId,
            items: cartItems.map((item: any) => ({
                productId: item.id,
                amount: item.amount,
                price: parseFloat(item.price)
            })),
            couponId
        };

        this.logger.info('CreateOrder - Creating order', { orderData }, { includePayload: true });
        const order = await this.orderRepository.create(tenantId, orderData);

        // Increment coupon usage if coupon was used
        if (couponId) {
            this.logger.info('CreateOrder - Incrementing coupon usage', { couponId });
            await this.couponRepository.incrementUsage(tenantId, couponId);
        }

        // Decrement stock for each product in the order
        this.logger.info('CreateOrder - Updating product stock');
        for (const item of cartItems) {
            const product = await this.productRepository.findById(tenantId, item.id);
            if (product) {
                const newStock = product.stock - item.amount;
                this.logger.debug(`Product ${item.id}: ${product.stock} -> ${newStock}`);
                await this.productRepository.update(tenantId, item.id, { stock: newStock });
            }
        }

        this.logger.info('CreateOrder - Clearing cart', { userId });
        await this.clearCartUseCase.execute(tenantId, userId);

        this.logger.info('CreateOrder - Success', { orderId: order.id }, { includeResponse: true });

        // Send order confirmation email asynchronously
        this.sendOrderConfirmation(tenantId, userId, order).catch((err: any) => {
            this.logger.error('Failed to send order confirmation email', { orderId: order.id, error: err.message });
        });

        return Success(order, 'Se ha generado su orden');
    }

    private async sendOrderConfirmation(tenantId: string, userId: string, order: any): Promise<void> {
        try {
            const features = await this.featureRepository.getTenantFeatureStatus(tenantId);
            if (!features['EMAIL_NOTIFICATIONS']) {
                this.logger.info('Skipping order confirmation email: EMAIL_NOTIFICATIONS feature disabled', { tenantId });
                return;
            }

            const user = await this.userRepository.findById(userId);
            if (!user || !user.email) {
                this.logger.warn('Cannot send order confirmation: user email not found', { userId });
                return;
            }

            await this.emailService.sendOrderConfirmation(user.email, order, {
                tenantName: 'Neutra', 
                supportEmail: process.env.SMTP_FROM || 'support@neutra.com',
                websiteUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
                primaryColor: '#000000',
            });
            this.logger.info('Order confirmation email sent successfully', { orderId: order.id, email: user.email });
        } catch (error: any) {
            this.logger.error('Order confirmation email failed', { orderId: order.id, error: error.message });
            throw error;
        }
    }
}
