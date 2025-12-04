import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class ChangeOrderStatusUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private logger: ILogger
    ) { }

    async execute(id: string, status: string) {
        this.logger.info('ChangeOrderStatus - Executing', { id, status }, { includePayload: true });

        try {
            // Validate status
            const validStatuses: OrderStatus[] = ['PENDIENTE', 'PAGADO', 'ENVIADO', 'ENTREGADO'];
            if (!validStatuses.includes(status as OrderStatus)) {
                this.logger.warn('ChangeOrderStatus - Invalid status', { id, status });
                return {
                    success: false,
                    message: "Invalid status",
                };
            }

            const order = await this.orderRepository.updateStatus(id, status as OrderStatus);
            this.logger.info('ChangeOrderStatus - Success', { id, newStatus: status }, { includeResponse: true });
            return {
                success: true,
                message: "Order status updated",
                data: order
            };
        } catch (error: any) {
            this.logger.error('Error updating order status', error, { id, status });
            return {
                success: false,
                message: "Error updating order status",
                errors: error.message || error
            };
        }
    }
}
