import { IProductRepository } from "@/core/repositories/product.repository.interface";
import { Success, UseCaseResult } from "@/core/utils/use-case-result";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

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
