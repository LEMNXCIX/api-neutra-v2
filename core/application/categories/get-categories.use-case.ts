import { ICategoryRepository } from '@/core/repositories/category.repository.interface';

export class GetCategoriesUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(page?: number, limit?: number) {
        const result = await this.categoryRepository.findAll(page, limit);
        return {
            success: true,
            code: 200,
            message: 'Categories retrieved successfully',
            data: result.categories,
            pagination: page && limit ? {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit)
            } : undefined
        };
    }

    async executeById(id: string) {
        const category = await this.categoryRepository.findById(id);

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
