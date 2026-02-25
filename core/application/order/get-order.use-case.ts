import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetOrderUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const order = await this.orderRepository.findById(tenantId, id);
        if (!order) {
            throw new AppError('Order not found', 404, ResourceErrorCodes.NOT_FOUND);
        }
        return Success(order);
    }
}
