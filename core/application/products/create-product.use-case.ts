import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { CreateProductDTO } from '@/core/entities/product.entity';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ValidationErrorCodes } from '@/types/error-codes';
import { VALIDATION_CONSTANTS } from '@/core/domain/constants';

export class CreateProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    private validateImageSize(base64String: string): boolean {
        const base64 = base64String.split(',')[1] || base64String;
        const sizeInBytes = (base64.length * 3) / 4 - (base64.indexOf('=') > 0 ? (base64.length - base64.indexOf('=')) : 0);
        return sizeInBytes <= VALIDATION_CONSTANTS.MAX_IMAGE_SIZE_BYTES;
    }

    async execute(tenantId: string, data: any): Promise<UseCaseResult> {
        const price = parseFloat(data.price);
        const stock = parseInt(data.stock) || 0;

        if (price < 0 || stock < 0) {
            throw new AppError(
                "Price and stock must be non-negative", 
                400, 
                ValidationErrorCodes.INVALID_DATA_TYPE
            );
        }

        if (data.image && !this.validateImageSize(data.image)) {
            throw new AppError(
                "Image size exceeds 5MB limit", 
                400, 
                ValidationErrorCodes.INVALID_FORMAT
            );
        }

        const newProduct: CreateProductDTO = {
            name: data.name,
            description: data.description,
            image: data.image,
            price,
            stock,
            ownerId: data.ownerId || data.owner
        };

        const product = await this.productRepository.create(tenantId, newProduct);
        return Success(product, "Product created successfully");
    }
}
