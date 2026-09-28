import type { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class SearchProductsUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(tenantId: string, name: string): Promise<UseCaseResult> {
        const products = await this.productRepository.searchByName(
            tenantId,
            name,
        );

        return Success(
            products,
            products.length ? "" : "No products found matching search",
        );
    }
}
