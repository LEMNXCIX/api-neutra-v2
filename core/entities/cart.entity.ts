import { Product } from "@/core/entities/product.entity";

export interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    amount: number;
    product?: Pick<Product, "id" | "name" | "price" | "image" | "stock">;
}

export interface Cart {
    id: string;
    userId: string;
    items: CartItem[];
    createdAt: Date;
    updatedAt: Date;
}
