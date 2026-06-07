import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetOrderStatsUseCase {
    constructor(private orderRepository: IOrderRepository) {}

    async execute(
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<UseCaseResult> {
        const stats = await this.orderRepository.getStats(
            tenantId,
            startDate,
            endDate,
        );
        return Success(stats, "Order stats retrieved successfully");
    }
}
