import { ICategoryRepository } from "@/core/repositories/category.repository.interface";
import { CategoryType } from "@/core/entities/category.entity";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

export class GetCategoriesUseCase {
    constructor(private categoryRepository: ICategoryRepository) {}

    async execute(
        tenantId: string | undefined,
        page?: number,
        limit?: number,
        type?: CategoryType,
    ): Promise<UseCaseResult> {
        const result = await this.categoryRepository.findAll(
            tenantId,
            page,
            limit,
            type,
        );
        const stats = await this.categoryRepository.getStats(tenantId);

        return Success(
            {
                categories: result.categories,
                stats,
                pagination:
                    page && limit
                        ? {
                              page,
                              limit,
                              total: result.total,
                              totalPages: Math.ceil(result.total / limit),
                          }
                        : {
                              page: 1,
                              limit: result.total,
                              total: result.total,
                              totalPages: 1,
                          },
            },
            "Categories retrieved successfully",
        );
    }

    async executeById(tenantId: string, id: string): Promise<UseCaseResult> {
        const category = await this.categoryRepository.findById(tenantId, id);

        if (!category) {
            throw new EntityNotFoundError("Category", id);
        }

        return Success(category, "Category retrieved successfully");
    }
}
