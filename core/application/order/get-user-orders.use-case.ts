import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';

export class GetUserOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(userId: string, status?: OrderStatus) {
        try {
            const orders = await this.orderRepository.findByUserId(userId, status);
            return orders;
        } catch (error: any) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
