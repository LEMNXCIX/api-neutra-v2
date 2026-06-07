import { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
