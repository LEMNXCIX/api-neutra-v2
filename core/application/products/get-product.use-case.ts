import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Success, UseCaseResult } from '@/core/utils/use-case-result';
import { AppError } from '@/types/api-response';
import { ResourceErrorCodes } from '@/types/error-codes';

export class GetProductUseCase {
    constructor(private productRepository: IProductRepository) { }

    async execute(tenantId: string | undefined, id: string): Promise<UseCaseResult> {
        const product = await this.productRepository.findById(tenantId, id);
        if (!product) {
            throw new AppError("Product not found", 404, ResourceErrorCodes.NOT_FOUND);
        }
        return Success(product);
    }
}
