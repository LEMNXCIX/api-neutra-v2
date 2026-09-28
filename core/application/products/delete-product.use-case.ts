import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";
import type { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class DeleteProductUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(
        tenantId: string,
        id: string,
        userId: string,
    ): Promise<UseCaseResult> {
        const product = await this.productRepository.findFirst(tenantId, {
            id,
            ownerId: userId,
        });

        if (!product) {
            throw new EntityNotFoundError("Product", id);
        }

        await this.productRepository.delete(tenantId, id);

        return Success(product, "Product deleted successfully");
    }
}
