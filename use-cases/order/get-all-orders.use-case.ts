import { IOrderRepository } from '../../core/repositories/order.repository.interface';

export class GetAllOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute() {
        try {
            const orders = await this.orderRepository.findAll();
            return orders;
        } catch (error: any) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
