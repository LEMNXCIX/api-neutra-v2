import { ICategoryRepository } from '@/core/repositories/category.repository.interface';

export class GetCategoryStatsUseCase {
    constructor(private categoryRepository: ICategoryRepository) { }

    async execute() {
        try {
            const stats = await this.categoryRepository.getStats();
            return {
                success: true,
                code: 200,
                message: 'Category stats retrieved successfully',
                data: stats
            };
        } catch (error: any) {
            console.error('Error getting category stats:', error);
            return {
                success: false,
                code: 500,
                message: 'Internal server error',
                data: null
            };
        }
    }
}
