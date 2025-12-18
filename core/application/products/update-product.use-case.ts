import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { UpdateProductDTO } from '@/core/entities/product.entity';

export class UpdateProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string, id: string, data: any) {
        try {
            const updateData: UpdateProductDTO = {
                name: data.name,
                description: data.description,
                image: data.image,
                price: data.price ? parseFloat(data.price) : undefined,
                stock: data.stock !== undefined ? parseInt(data.stock) : undefined,
                categoryIds: data.categoryIds || data.categories
            };

            const product = await this.productRepository.update(tenantId, id, updateData);
            return {
                success: true,
                code: 200,
                message: "Product updated successfully",
                data: product
            };
        } catch (error: any) {
            if (error.code === 'P2025') {
                return {
                    success: false,
                    code: 404,
                    message: "Product not found",
                    data: null
                };
            }
            return {
                success: false,
                code: 500,
                message: "Error updating product",
                errors: error.message || error
            };
        }
    }
}
