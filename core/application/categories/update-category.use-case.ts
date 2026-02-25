import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { UpdateCategoryDTO } from '@/core/entities/category.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class UpdateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, id: string, data: UpdateCategoryDTO): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findById(tenantId, id);

        if (!existingCategory) {
            throw new AppError('Category not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        if (data.name) {
            const categoryWithSameName = await this.categoryRepository.findByName(tenantId, data.name);
            if (categoryWithSameName && categoryWithSameName.id !== id) {
                throw new AppError('Category name already in use', 409, ResourceErrorCodes.ALREADY_EXISTS);
            }
        }

        const updatedCategory = await this.categoryRepository.update(tenantId, id, data);

        return Success(updatedCategory, 'Category updated successfully');
    }
}
