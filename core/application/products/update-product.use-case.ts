import type { UpdateProductDTO } from "@/core/application/dtos/requests/product.request";
import type {
    IProductRepository,
    UpdateProductData,
} from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class UpdateProductUseCase {
    constructor(private productRepository: IProductRepository) {}

    async execute(
        tenantId: string,
        id: string,
        data: UpdateProductDTO,
    ): Promise<UseCaseResult> {
        const updateData: UpdateProductData = {
            name: data.name,
            description: data.description,
            image: data.image,
            price:
                data.price != null
                    ? typeof data.price === "string"
                        ? parseFloat(data.price)
                        : data.price
                    : undefined,
            stock:
                data.stock !== undefined
                    ? typeof data.stock === "string"
                        ? parseInt(data.stock, 10)
                        : data.stock
                    : undefined,
            categoryIds: data.categoryIds,
        };

        const product = await this.productRepository.update(
            tenantId,
            id,
            updateData,
        );
        return Success(product, "Product updated successfully");
    }
}
