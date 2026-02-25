import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { UpdateOrderDTO } from '@/core/entities/order.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class UpdateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string, data: UpdateOrderDTO): Promise<UseCaseResult> {
        this.logger.info('UpdateOrder - Executing', { id, data }, { includePayload: true });

        const order = await this.orderRepository.update(tenantId, id, data);

        this.logger.info('UpdateOrder - Success', { id }, { includeResponse: true });
        return Success(order, "Order updated successfully");
    }
}
