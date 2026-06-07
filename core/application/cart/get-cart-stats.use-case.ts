import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetCartStatsUseCase {
    constructor(private cartRepository: ICartRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const result: Array<{ yearMonth: string; total: number }> =
            await this.cartRepository.getStats(tenantId);

        const data = result.map((r) => ({
            _id: r.yearMonth,
            total: r.total,
        }));

        return Success(data, "Cart statistics retrieved successfully");
    }
}
