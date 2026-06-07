import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { UpdateCategoryDTO } from "@/core/application/dtos/requests/category.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import {
    EntityNotFoundError,
    DuplicateEntityError,
} from "@/core/domain/errors/domain-errors";

export class UpdateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateCategoryDTO,
    ): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findById(
            tenantId,
            id,
        );

        if (!existingCategory) {
            throw new EntityNotFoundError("Category", id);
        }

        if (data.name) {
            const categoryWithSameName =
                await this.categoryRepository.findByName(tenantId, data.name);
            if (categoryWithSameName && categoryWithSameName.id !== id) {
                throw new DuplicateEntityError("Category", "name", data.name);
            }
        }

        const updatedCategory = await this.categoryRepository.update(
            tenantId,
            id,
            data,
        );

        return Success(updatedCategory, "Category updated successfully");
    }
}
