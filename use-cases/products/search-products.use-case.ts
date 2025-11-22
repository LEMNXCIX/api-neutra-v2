import { IProductRepository } from '../../core/repositories/product.repository.interface';

export class SearchProductsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(name: string) {
        try {
            const products = await this.productRepository.searchByName(name);
            return {
                success: true,
                code: 200,
                message: products.length ? "" : "No products found matching search",
                data: products
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error searching products",
                errors: error.message || error
            };
        }
    }
}
