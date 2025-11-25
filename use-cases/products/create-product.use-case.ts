import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { CreateProductDTO } from '@/core/entities/product.entity';

export class CreateProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(data: any) {
        try {
            const newProduct: CreateProductDTO = {
                name: data.name,
                description: data.description,
                image: data.image,
                price: parseFloat(data.price),
                ownerId: data.owner
            };

            const product = await this.productRepository.create(newProduct);
            return {
                success: true,
                code: 201,
                message: "Product created successfully",
                data: product
            };
        } catch (error: any) {
            return {
                success: false,
                code: 400,
                message: "Error creating product",
                errors: error.message || error
            };
        }
    }
}
