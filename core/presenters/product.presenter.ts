import { Product } from "@/core/entities/product.entity";
import {
    ProductResponse,
    IProductResponse,
} from "@/core/application/dtos/responses/product/product.response";

export class ProductPresenter {
    static toResponse(product: Product): IProductResponse {
        return ProductResponse.fromEntity(product);
    }

    static toResponseList(products: Product[]): IProductResponse[] {
        if (!Array.isArray(products)) return [];
        return products.map((p) => ProductResponse.fromEntity(p));
    }
}
