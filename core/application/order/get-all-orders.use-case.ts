import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetAllOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string): Promise<UseCaseResult> {
        const orders = await this.orderRepository.findAll(tenantId);
        return Success(orders);
    }
}
