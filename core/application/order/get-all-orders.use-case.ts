import { IOrderRepository } from '@/core/repositories/order.repository.interface';

export class GetAllOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string) {
        try {
            const orders = await this.orderRepository.findAll(tenantId);
            return orders;
        } catch (error: any) {
            return {
                error: true,
                message: error,
            };
        }
    }
}
