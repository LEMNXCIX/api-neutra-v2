import { IProductRepository } from '../../core/repositories/product.repository.interface';

export class DeleteProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(id: string, userId: string) {
        try {
            const product = await this.productRepository.findFirst({ id, ownerId: userId });

            if (!product) {
                return {
                    success: false,
                    code: 404,
                    message: "Product not found or not authorized",
                    data: null
                };
            }

            await this.productRepository.delete(id);

            return {
                success: true,
                code: 200,
                message: "Product deleted successfully",
                data: product
            };
        } catch (error: any) {
            return {
                success: false,
                code: 500,
                message: "Error deleting product",
                errors: error.message || error
            };
        }
    }
}
