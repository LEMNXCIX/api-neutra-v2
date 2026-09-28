import type { CreateCategoryDTO } from "@/core/application/dtos/requests/category.request";
import { DuplicateEntityError } from "@/core/domain/errors/domain-errors";
import type {
    CategoryCreateData,
    ICategoryRepository,
} from "@/core/repositories/category.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

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

        const repoData: CategoryCreateData = {
            name: data.name,
            description: data.description,
            type: data.type,
            active: data.active,
        };
        const category = await this.categoryRepository.create(
            tenantId,
            repoData,
        );

        return Success(category, "Category created successfully");
    }
}
