import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetProductStatsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute() {
        try {
            const stats = await this.productRepository.getStats();
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
