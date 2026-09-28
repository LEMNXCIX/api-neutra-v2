import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class DeleteCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findById(
            tenantId,
            id,
        );

        if (!existingCategory) {
            throw new EntityNotFoundError("Category", id);
        }

        await this.categoryRepository.delete(tenantId, id);

        return Success(null, "Category deleted successfully");
    }
}
