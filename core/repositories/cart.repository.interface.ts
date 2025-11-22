import { Cart, CartItem } from '../entities/cart.entity';

export interface ICartRepository {
    findByUserId(userId: string): Promise<Cart | null>;
    findByUserIdSimple(userId: string): Promise<Cart | null>;
    create(userId: string): Promise<Cart>;
    addItem(cartId: string, productId: string, amount: number): Promise<CartItem>;
    removeItem(cartId: string, productId: string): Promise<void>;
    updateItemAmount(cartId: string, productId: string, amount: number): Promise<CartItem>;
    clearItems(cartId: string): Promise<void>;
    getStats(): Promise<any[]>;
}
