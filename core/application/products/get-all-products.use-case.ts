import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';

export class GetAllProductsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string | undefined): Promise<UseCaseResult> {
        const products = await this.productRepository.findAll(tenantId);

        return Success(products, "Products listed successfully");
    }
}
