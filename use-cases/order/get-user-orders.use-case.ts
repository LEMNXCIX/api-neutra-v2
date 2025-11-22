import { IOrderRepository } from '../../core/repositories/order.repository.interface';

export class GetUserOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(userId: string) {
        try {
            const orders = await this.orderRepository.findByUserId(userId);
            return orders;
        } catch (error: any) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
