import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetAllProductsUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string) {
        const products = await this.productRepository.findAll(tenantId);
        return {
            success: true,
            code: 200,
            message: "Products listed successfully",
            data: products
        };
    }
}
