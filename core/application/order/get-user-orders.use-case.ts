import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetUserOrdersUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string, userId: string, status?: OrderStatus): Promise<UseCaseResult> {
        const orders = await this.orderRepository.findByUserId(tenantId, userId, status);
        return Success(orders);
    }
}
