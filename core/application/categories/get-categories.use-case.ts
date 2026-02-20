import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CategoryType } from '@/core/entities/category.entity';

export class GetCategoriesUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string | undefined, page?: number, limit?: number, type?: CategoryType) {
        const result = await this.categoryRepository.findAll(tenantId, page, limit, type);
        const stats = await this.categoryRepository.getStats(tenantId);

        return {
            success: true,
            code: 200,
            message: 'Categories retrieved successfully',
            data: {
                categories: result.categories,
                stats,
                pagination: page && limit ? {
                    page,
                    limit,
                    total: result.total,
                    totalPages: Math.ceil(result.total / limit)
                } : {
                    page: 1,
                    limit: result.total,
                    total: result.total,
                    totalPages: 1
                }
            }
        };
    }

    async executeById(tenantId: string, id: string) {
        const category = await this.categoryRepository.findById(tenantId, id);

        if (!category) {
            return {
                success: false,
                code: 404,
                message: 'Category not found',
                data: null
            };
        }

        return {
            success: true,
            code: 200,
            message: 'Category retrieved successfully',
            data: category
        };
    }
}
