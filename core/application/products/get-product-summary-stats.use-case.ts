import { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";

export class GetProductSummaryStatsUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.productRepository.getSummaryStats(tenantId);

        return Success(
            stats,
            "Product summary statistics retrieved successfully",
        );
    }
}
