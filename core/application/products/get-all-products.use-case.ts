import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetAllProductsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const products = await this.productRepository.findAll(tenantId);
        const stats = await this.productRepository.getSummaryStats(tenantId);

        return Success({
            products,
            stats,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: products.length,
                itemsPerPage: products.length
            }
        }, "Products listed successfully");
    }
}
