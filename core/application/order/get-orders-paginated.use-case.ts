import { IOrderRepository } from '@/core/repositories/order.repository.interface';

export class GetOrdersPaginatedUseCase {
    constructor(private orderRepository: IOrderRepository) { }

    async execute(tenantId: string, options: {
        search?: string;
        status?: string;
        page?: number;
        limit?: number;
        startDate?: Date;
        endDate?: Date;
    }) {
        try {
            const page = options.page || 1;
            const limit = options.limit || 10;

            const result = await this.orderRepository.findAllPaginated(tenantId, {
                search: options.search,
                status: options.status || 'all',
                page,
                limit,
                startDate: options.startDate,
                endDate: options.endDate
            });

            const totalPages = Math.ceil(result.total / limit);

            return {
                success: true,
                code: 200,
                message: 'Orders retrieved successfully',
                data: result.orders,
                pagination: {
                    page,
                    limit,
                    total: result.total,
                    totalPages
                }
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: 'Failed to retrieve orders',
                errors: [{
                    code: 'SYSTEM_INTERNAL_ERROR',
                    message: error.message
                }]
            };
        }
    }
}
