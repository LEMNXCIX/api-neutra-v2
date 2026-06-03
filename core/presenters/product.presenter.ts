import {
    ProductResponse,
    IProductResponse,
} from "@/core/application/dtos/responses/product/product.response";

export class ProductPresenter {
    static toResponse(product: any): IProductResponse {
        return ProductResponse.fromEntity(product);
    }

    static toResponseList(products: any[]): IProductResponse[] {
        return products.map((p) => ProductResponse.fromEntity(p));
    }
}
