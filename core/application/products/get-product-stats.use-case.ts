import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetProductStatsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string) {
        try {
            const stats = await this.productRepository.getStats(tenantId);
            return {
                success: true,
                code: 200,
                message: "Product statistics retrieved successfully",
                data: stats
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error fetching product statistics",
                errors: error.message || error
            };
        }
    }
}
