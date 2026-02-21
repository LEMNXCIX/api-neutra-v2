import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';
import { ILogger } from '@/core/providers/logger.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { BusinessErrorCodes } from '@/types/error-codes';

export class ChangeOrderStatusUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private logger: ILogger
    ) { }

    async execute(tenantId: string, id: string, status: string): Promise<UseCaseResult> {
        this.logger.info('ChangeOrderStatus - Executing', { id, status }, { includePayload: true });

        const validStatuses: OrderStatus[] = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO'];
        if (!validStatuses.includes(status as OrderStatus)) {
            this.logger.warn('ChangeOrderStatus - Invalid status', { id, status });
            throw new AppError("Invalid status", 400, BusinessErrorCodes.INVALID_STATUS_TRANSITION);
        }

        const order = await this.orderRepository.updateStatus(tenantId, id, status as OrderStatus);
        this.logger.info('ChangeOrderStatus - Success', { id, newStatus: status }, { includeResponse: true });
        return Success(order, "Order status updated");
    }
}
