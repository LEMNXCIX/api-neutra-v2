import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { UpdateCategoryDTO } from '@/core/entities/category.entity';

export class UpdateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, id: string, data: UpdateCategoryDTO) {
        const existingCategory = await this.categoryRepository.findById(tenantId, id);

        if (!existingCategory) {
            return {
                success: false,
                code: 404,
                message: 'Category not found',
                data: null
            };
        }

        if (data.name) {
            const categoryWithSameName = await this.categoryRepository.findByName(tenantId, data.name);
            if (categoryWithSameName && categoryWithSameName.id !== id) {
                return {
                    success: false,
                    code: 409,
                    message: 'Category name already in use',
                    data: null
                };
            }
        }

        const updatedCategory = await this.categoryRepository.update(tenantId, id, data);

        return {
            success: true,
            code: 200,
            message: 'Category updated successfully',
            data: updatedCategory
        };
    }
}
