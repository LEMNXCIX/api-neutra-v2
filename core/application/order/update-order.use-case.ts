import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { UpdateOrderDTO } from '@/core/entities/order.entity';
import { ILogger } from '@/core/providers/logger.interface';

export class UpdateOrderUseCase {
    constructor(
        private orderRepository: IOrderRepository,
        private logger: ILogger
    ) { }

    async execute(id: string, data: UpdateOrderDTO) {
        this.logger.info('UpdateOrder - Executing', { id, data }, { includePayload: true });

        try {
            const order = await this.orderRepository.update(id, data);

            this.logger.info('UpdateOrder - Success', { id }, { includeResponse: true });
            return {
                success: true,
                code: 200,
                message: "Order updated successfully",
                data: order
            };
        } catch (error: any) {
            this.logger.error('Error updating order', error, { id });
            return {
                success: false,
                code: 500,
                message: "Error updating order",
                errors: error.message || error
            };
        }
    }
}
