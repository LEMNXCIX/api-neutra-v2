import { IOrderRepository } from '../../core/repositories/order.repository.interface';
import { GetCartUseCase } from '../cart/get-cart.use-case';
import { ClearCartUseCase } from '../cart/clear-cart.use-case';
import { CreateOrderDTO } from '../../core/entities/order.entity';

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
                message: 'Tu carrito esta vacío, no puedes generar una orden.',
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

            return { message: 'Se ha generado su orden', orderFinal: order };
        } catch (error: any) {
            return {
                success: false,
                message: "Error creating order",
                errors: error.message || error
            };
        }
    }
}
