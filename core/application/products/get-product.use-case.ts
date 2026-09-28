import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class GetProductUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(
        tenantId: string | undefined,
        id: string,
    ): Promise<UseCaseResult> {
        const product = await this.productRepository.findById(tenantId, id);
        if (!product) {
            throw new EntityNotFoundError("Product", id);
        }
        return Success(product);
    }
}
