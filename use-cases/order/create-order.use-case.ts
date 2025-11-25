import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { GetCartUseCase } from '@/use-cases/cart/get-cart.use-case';
import { ClearCartUseCase } from '@/use-cases/cart/clear-cart.use-case';
import { CreateOrderDTO } from '@/core/entities/order.entity';
import { BusinessErrorCodes } from '@/types/error-codes';

export class CreateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private getCartUseCase: GetCartUseCase,
        private clearCartUseCase: ClearCartUseCase
    ) { }

    async execute(userId: string) {
        const cartResponse = await this.getCartUseCase.execute(userId);

        if (!cartResponse.success || !cartResponse.data || (Array.isArray(cartResponse.data) && cartResponse.data.length === 0)) {
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

        try {
            const orderData: CreateOrderDTO = {
                userId,
                items: cartItems.map((item: any) => ({
                    productId: item.id,
                    amount: item.amount,
                    price: parseFloat(item.price)
                }))
            };

            const order = await this.orderRepository.create(orderData);
            await this.clearCartUseCase.execute(userId);

            return {
                success: true,
                code: 201,
                message: 'Se ha generado su orden',
                data: order
            };
        } catch (error: any) {
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
