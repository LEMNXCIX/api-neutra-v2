import { ICategoryRepository } from '@/core/repositories/category.repository.interface';
import { CreateCategoryDTO } from '@/core/entities/category.entity';

export class CreateCategoryUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute(tenantId: string, data: CreateCategoryDTO) {
        const existingCategory = await this.categoryRepository.findByName(tenantId, data.name);

        if (existingCategory) {
            return {
                success: false,
                code: 409,
                message: 'Category already exists',
                data: null
            };
        }

        const category = await this.categoryRepository.create(tenantId, data);

        return {
            success: true,
            code: 201,
            message: 'Category created successfully',
            data: category
        };
    }
}
