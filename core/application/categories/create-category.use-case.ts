import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { CreateCategoryDTO } from "@/core/application/dtos/requests/category.request";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";

export class CreateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(
        tenantId: string,
        data: CreateCategoryDTO,
    ): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findByName(
            tenantId,
            data.name,
        );

        if (existingCategory) {
            throw new DuplicateEntityError("Category", "name", data.name);
        }

        const category = await this.categoryRepository.create(tenantId, data);

        return Success(category, "Category created successfully");
    }
}
