import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { OrderStatus } from '@/core/entities/order.entity';

export class ChangeOrderStatusUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(id: string, status: string) {
        try {
            // Validate status
            const validStatuses: OrderStatus[] = ['PENDIENTE', 'COMPLETADO', 'CANCELADO'];
            if (!validStatuses.includes(status as OrderStatus)) {
                return {
                    success: false,
                    message: "Invalid status",
                };
            }

            const order = await this.orderRepository.updateStatus(id, status as OrderStatus);
            return {
                success: true,
                message: "Order status updated",
                data: order
            };
        } catch (error: any) {
            return {
                success: false,
                message: "Error updating order status",
                errors: error.message || error
            };
        }
    }
}
