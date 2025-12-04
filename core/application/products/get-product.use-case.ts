import { IProductRepository } from '@/core/repositories/product.repository.interface';

export class GetProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(id: string) {
        const product = await this.productRepository.findById(id);
        if (!product) {
            return {
                success: false,
                code: 404,
                message: "Product not found",
                data: null
            };
        }
        return {
            success: true,
            code: 200,
            message: "",
            data: product
        };
    }
}
