import { ICategoryRepository } from '@/core/repositories/category.repository.interface';

export class GetCategoriesUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute() {
        const categories = await this.categoryRepository.findAll();
        return {
            success: true,
            code: 200,
            message: 'Categories retrieved successfully',
            data: categories
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
