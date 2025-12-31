import { ICategoryRepository } from '@/core/repositories/category.repository.interface';

export class DeleteCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, id: string) {
        const existingCategory = await this.categoryRepository.findById(tenantId, id);

        if (!existingCategory) {
            return {
                success: false,
                code: 404,
                message: 'Category not found',
                data: null
            };
        }

        await this.categoryRepository.delete(tenantId, id);

        return {
            success: true,
            code: 200,
            message: 'Category deleted successfully',
            data: null
        };
    }
}
