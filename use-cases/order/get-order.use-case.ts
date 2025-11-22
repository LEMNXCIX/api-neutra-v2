import { IOrderRepository } from '../../core/repositories/order.repository.interface';

export class GetOrderUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string) {
        try {
            const order = await this.orderRepository.findById(id);
            return order;
        } catch (error: any) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
