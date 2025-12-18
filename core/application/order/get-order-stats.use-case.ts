import { IOrderRepository } from '@/core/repositories/order.repository.interface';

export class GetOrderStatsUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string, startDate?: Date, endDate?: Date) {
        try {
            const stats = await this.orderRepository.getStats(tenantId, startDate, endDate);
            return {
                success: true,
                code: 200,
                message: 'Order stats retrieved successfully',
                data: stats
            };
        } catch (error: any) {
            console.error('Error getting order stats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
}
