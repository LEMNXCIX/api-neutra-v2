import { Cart, CartItem } from '@/core/entities/cart.entity';

/**
 * Cart Repository Interface - Tenant-Scoped
 * Note: Cart belongs to User, which belongs to Tenant
 */
export interface ICartRepository {
    findByUserId(tenantId: string | undefined, userId: string): Promise<Cart | null>;
    findByUserIdSimple(tenantId: string | undefined, userId: string): Promise<Cart | null>;
    create(tenantId: string | undefined, userId: string): Promise<Cart>;
    addItem(tenantId: string | undefined, cartId: string, productId: string, amount: number): Promise<CartItem>;
    removeItem(tenantId: string | undefined, cartId: string, productId: string): Promise<void>;
    updateItemAmount(tenantId: string | undefined, cartId: string, productId: string, amount: number): Promise<CartItem>;
    clearItems(tenantId: string | undefined, cartId: string): Promise<void>;
    getStats(tenantId: string | undefined): Promise<any[]>;
}
