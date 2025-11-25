export interface Product {
    id: string;
    name: string;
    price: number;
    image: string;
    description?: string;
    stock: number;
}

export interface CartItem {
    id: string;
    cartId: string;
    productId: string;
    amount: number;
    product?: Product;
}

export interface Cart {
    id: string;
    userId: string;
    items: CartItem[];
    createdAt: Date;
    updatedAt: Date;
}
