import type { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetCategoryStatsUseCase {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(tenantId: string): Promise<UseCaseResult> {
        const stats = await this.categoryRepository.getStats(tenantId);

        return Success(stats, "Category stats retrieved successfully");
    }
}
