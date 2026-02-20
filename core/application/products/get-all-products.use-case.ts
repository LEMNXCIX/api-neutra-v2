import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetAllProductsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string | undefined) {
        const products = await this.productRepository.findAll(tenantId);
        const stats = await this.productRepository.getSummaryStats(tenantId);

        return {
            success: true,
            code: 200,
            message: "Products listed successfully",
            data: {
                products,
                stats,
                pagination: {
                    currentPage: 1,
                    totalPages: 1,
                    totalItems: products.length,
                    itemsPerPage: products.length
                }
            }
        };
    }
}
