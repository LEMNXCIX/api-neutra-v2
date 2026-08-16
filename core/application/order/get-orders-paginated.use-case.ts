import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetOrdersPaginatedUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(
        tenantId: string,
        options: {
            search?: string;
            status?: string;
            page?: number;
            limit?: number;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<UseCaseResult> {
        const page = options.page || 1;
        const limit = options.limit || 10;

        const result = await this.orderRepository.findAllPaginated(tenantId, {
            search: options.search,
            status: options.status || "all",
            page,
            limit,
            startDate: options.startDate,
            endDate: options.endDate,
        });

        return Success(
            result.orders,
            "Orders retrieved successfully",
        );
    }
}
