import type { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetProductStatsUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.productRepository.getStats(tenantId);

        return Success(stats, "Product statistics retrieved successfully");
    }
}
