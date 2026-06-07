import { Cart, CartItem } from "@/core/entities/cart.entity";

export interface ICartProductResponse {
    name: string;
    price: number;
    image: string | null;
    description?: string;
}

export interface ICartItemResponse {
    id: string;
    productId: string;
    amount: number;
    product?: ICartProductResponse;
}

export interface ICartResponse {
    id: string;
    userId: string;
    items: ICartItemResponse[];
    createdAt: Date;
    updatedAt: Date;
}

export class CartResponse {
    static fromEntity(cart: Cart): ICartResponse {
        return {
            id: cart.id,
            userId: cart.userId,
            items: cart.items?.map((item: CartItem) => ({
                id: item.id,
                productId: item.productId,
                amount: item.amount,
                product: item.product
                    ? {
                          name: item.product.name,
                          price: item.product.price,
                          image: item.product.image,
                      }
                    : undefined,
            })),
            createdAt: cart.createdAt,
            updatedAt: cart.updatedAt,
        };
    }
}
