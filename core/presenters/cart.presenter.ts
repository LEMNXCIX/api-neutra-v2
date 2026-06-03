import {
    CartResponse,
    ICartResponse,
} from "@/core/application/dtos/responses/cart/cart.response";

export class CartPresenter {
    static toResponse(cart: any): ICartResponse {
        return CartResponse.fromEntity(cart);
    }

    static toResponseList(carts: any[]): ICartResponse[] {
        return carts.map((c) => CartResponse.fromEntity(c));
    }
}
