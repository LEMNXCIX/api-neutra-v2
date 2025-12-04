import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { GetCartUseCase } from '@/core/application/cart/get-cart.use-case';
import { ClearCartUseCase } from '@/core/application/cart/clear-cart.use-case';
import { CreateOrderDTO } from '@/core/entities/order.entity';
import { BusinessErrorCodes } from '@/types/error-codes';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { ICouponRepository } from '@/core/repositories/coupon.repository.interface';
import { ILogger } from '@/core/providers/logger.interface';

export class CreateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private getCartUseCase: GetCartUseCase,
        private clearCartUseCase: ClearCartUseCase,
        private productRepository: IProductRepository,
        private couponRepository: ICouponRepository,
        private logger: ILogger
    ) { }

    async execute(userId: string, couponId?: string) {
        this.logger.info('CreateOrder - Executing', { userId, couponId });

        const cartResponse = await this.getCartUseCase.execute(userId);

        if (!cartResponse.success || !cartResponse.data || (Array.isArray(cartResponse.data) && cartResponse.data.length === 0)) {
            this.logger.warn('CreateOrder - Cart is empty', { userId });
            return {
                success: false,
                code: 422,
                message: 'Tu carrito esta vacío, no puedes generar una orden.',
                errors: [{
                    code: BusinessErrorCodes.CART_EMPTY,
                    message: 'Cannot create order with empty cart'
                }]
            };
        }

        const cartItems = cartResponse.data as any[];
        this.logger.info('CreateOrder - Cart items count', { count: cartItems.length });

        try {
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
            const order = await this.orderRepository.create(orderData);

            // Increment coupon usage if coupon was used
            if (couponId) {
                this.logger.info('CreateOrder - Incrementing coupon usage', { couponId });
                await this.couponRepository.incrementUsage(couponId);
            }

            // Decrement stock for each product in the order
            this.logger.info('CreateOrder - Updating product stock');
            for (const item of cartItems) {
                const product = await this.productRepository.findById(item.id);
                if (product) {
                    const newStock = product.stock - item.amount;
                    this.logger.debug(`Product ${item.id}: ${product.stock} -> ${newStock}`);
                    await this.productRepository.update(item.id, { stock: newStock });
                }
            }

            this.logger.info('CreateOrder - Clearing cart', { userId });
            await this.clearCartUseCase.execute(userId);

            this.logger.info('CreateOrder - Success', { orderId: order.id }, { includeResponse: true });

            return {
                success: true,
                code: 201,
                message: 'Se ha generado su orden',
                data: order
            };
        } catch (error: any) {
            this.logger.error('Error creating order', error, { userId });
            return {
                success: false,
                code: 500,
                message: "Error creating order",
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message || 'Unknown error occurred'
                }]
            };
        }
    }
}
