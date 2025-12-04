import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetProductSummaryStatsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute() {
        try {
            const stats = await this.productRepository.getSummaryStats();
            return {
                success: true,
                code: 200,
                message: "Product summary statistics retrieved successfully",
                data: stats
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching product summary statistics",
                errors: error.message || error
            };
        }
    }
}
