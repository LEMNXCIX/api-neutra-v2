import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class DeleteCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, id: string): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findById(tenantId, id);

        if (!existingCategory) {
            throw new AppError('Category not found', 404, ResourceErrorCodes.NOT_FOUND);
        }

        await this.categoryRepository.delete(tenantId, id);

        return Success(null, 'Category deleted successfully');
    }
}
