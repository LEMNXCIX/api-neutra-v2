import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateCategoryDTO } from '@/core/entities/category.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class CreateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, data: CreateCategoryDTO): Promise<UseCaseResult> {
        const existingCategory = await this.categoryRepository.findByName(tenantId, data.name);

        if (existingCategory) {
            throw new AppError('Category already exists', 409, ResourceErrorCodes.ALREADY_EXISTS);
        }

        const category = await this.categoryRepository.create(tenantId, data);

        return Success(category, 'Category created successfully');
    }
}
