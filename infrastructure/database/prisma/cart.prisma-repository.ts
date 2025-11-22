import { prisma } from '../../../config/db.config';
import { ICartRepository } from '../../../core/repositories/cart.repository.interface';
import { Cart, CartItem } from '../../../core/entities/cart.entity';

export class PrismaCartRepository implements ICartRepository {
    async findByUserId(userId: string): Promise<Cart | null> {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!cart) return null;
        return cart as unknown as Cart; // Casting due to Prisma types vs Domain types
    }

    async findByUserIdSimple(userId: string): Promise<Cart | null> {
        const cart = await prisma.cart.findUnique({
            where: { userId },
            include: { items: true }
        });
        if (!cart) return null;
        return cart as unknown as Cart;
    }

    async create(userId: string): Promise<Cart> {
        const cart = await prisma.cart.create({
            data: { userId }
        });
        return cart as unknown as Cart;
    }

    async addItem(cartId: string, productId: string, amount: number): Promise<CartItem> {
        const item = await prisma.cartItem.create({
            data: {
                cartId,
                productId,
                amount
            }
        });
        return item as unknown as CartItem;
    }

    async removeItem(cartId: string, productId: string): Promise<void> {
        await prisma.cartItem.delete({
            where: {
                cartId_productId: {
                    cartId,
                    productId
                }
            }
        });
    }

    async updateItemAmount(cartId: string, productId: string, amount: number): Promise<CartItem> {
        const item = await prisma.cartItem.update({
            where: {
                cartId_productId: {
                    cartId,
                    productId
                }
            },
            data: { amount }
        });
        return item as unknown as CartItem;
    }

    async clearItems(cartId: string): Promise<void> {
        await prisma.cartItem.deleteMany({
            where: { cartId }
        });
    }

    async getStats(): Promise<any[]> {
        return prisma.$queryRaw`
      SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
      FROM carts
      WHERE "createdAt" >= NOW() - INTERVAL '1 year'
      GROUP BY "yearMonth"
      ORDER BY "yearMonth" ASC
    `;
    }
}
