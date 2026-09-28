import type { CreateProductDTO } from "@/core/application/dtos/requests/product.request";
import { VALIDATION_CONSTANTS } from "@/core/domain/constants";
import { ValidationError } from "@/core/domain/errors/domain-errors";
import type {
    CreateProductData,
    IProductRepository,
} from "@/core/repositories/product.repository.interface";
import { Success, type UseCaseResult } from "@/core/utils/use-case-result";

export class CreateProductUseCase {
    constructor(private productRepository: IProductRepository) {}

    private validateImageSize(base64String: string): boolean {
        const base64 = base64String.split(",")[1] || base64String;
        const sizeInBytes =
            (base64.length * 3) / 4 -
            (base64.indexOf("=") > 0 ? base64.length - base64.indexOf("=") : 0);
        return sizeInBytes <= VALIDATION_CONSTANTS.MAX_IMAGE_SIZE_BYTES;
    }

    async execute(
        tenantId: string,
        data: CreateProductDTO & Record<string, unknown>,
    ): Promise<UseCaseResult> {
        const price =
            typeof data.price === "string"
                ? parseFloat(data.price)
                : data.price;
        const stock =
            typeof data.stock === "string"
                ? parseInt(data.stock as string, 10)
                : (data.stock ?? 0);

        if (price < 0 || stock < 0) {
            throw new ValidationError("Price and stock must be non-negative");
        }

        if (data.image && !this.validateImageSize(data.image)) {
            throw new ValidationError("Image size exceeds 5MB limit");
        }

        const newProduct: CreateProductData = {
            name: data.name,
            description: data.description,
            image: data.image,
            price,
            stock,
            ownerId: (data.ownerId as string) || (data.owner as string),
        };

        const product = await this.productRepository.create(
            tenantId,
            newProduct,
        );
        return Success(product, "Product created successfully");
    }
}
