import { Cart } from "@/core/entities/cart.entity";
import {
    CartResponse,
    ICartResponse,
} from "@/core/application/dtos/responses/cart/cart.response";

export class CartPresenter {
    static toResponse(cart: Cart): ICartResponse {
        return CartResponse.fromEntity(cart);
    }

    static toResponseList(carts: Cart[]): ICartResponse[] {
        return carts.map((c) => CartResponse.fromEntity(c));
    }
}
