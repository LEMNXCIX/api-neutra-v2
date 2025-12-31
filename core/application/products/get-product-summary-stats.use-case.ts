import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetProductSummaryStatsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string) {
        try {
            const stats = await this.productRepository.getSummaryStats(tenantId);
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
