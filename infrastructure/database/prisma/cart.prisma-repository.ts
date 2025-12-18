import { prisma } from '@/config/db.config';
import { ICartRepository } from '@/core/repositories/cart.repository.interface';
import { Cart, CartItem } from '@/core/entities/cart.entity';

/**
 * Tenant-Aware Cart Repository
 * Validates tenant ownership via User relation
 */
export class PrismaCartRepository implements ICartRepository {

    private async validateCartTenant(tenantId: string | undefined, cartId: string): Promise<void> {
        if (!tenantId) return; // Super Admin global access

        const count = await prisma.cart.count({
            where: {
                id: cartId,
                user: { tenantId }
            }
        });
        if (count === 0) {
            throw new Error('Cart not found or does not belong to this tenant');
        }
    }

    async findByUserId(tenantId: string | undefined, userId: string): Promise<Cart | null> {
        const where: any = { userId };
        if (tenantId) where.user = { tenantId };

        const cart = await prisma.cart.findFirst({
            where,
            include: {
                items: {
                    include: {
                        product: true
                    }
                }
            }
        });
        if (!cart) return null;
        return cart as unknown as Cart;
    }

    async findByUserIdSimple(tenantId: string | undefined, userId: string): Promise<Cart | null> {
        const where: any = { userId };
        if (tenantId) where.user = { tenantId };

        const cart = await prisma.cart.findFirst({
            where,
            include: { items: true }
        });
        if (!cart) return null;
        return cart as unknown as Cart;
    }

    async create(tenantId: string | undefined, userId: string): Promise<Cart> {
        // Verify user exists (and belongs to tenant if specified)
        const where: any = { id: userId };
        if (tenantId) where.tenantId = tenantId;

        const user = await prisma.user.findFirst({
            where
        });

        if (!user) {
            throw new Error(tenantId ? 'User not found in this tenant' : 'User not found');
        }

        const cart = await prisma.cart.create({
            data: { userId }
        });
        return cart as unknown as Cart;
    }

    async addItem(tenantId: string | undefined, cartId: string, productId: string, amount: number): Promise<CartItem> {
        await this.validateCartTenant(tenantId, cartId);

        const item = await prisma.cartItem.create({
            data: {
                cartId,
                productId,
                amount
            }
        });
        return item as unknown as CartItem;
    }

    async removeItem(tenantId: string | undefined, cartId: string, productId: string): Promise<void> {
        await this.validateCartTenant(tenantId, cartId);

        await prisma.cartItem.delete({
            where: {
                cartId_productId: {
                    cartId,
                    productId
                }
            }
        });
    }

    async updateItemAmount(tenantId: string | undefined, cartId: string, productId: string, amount: number): Promise<CartItem> {
        await this.validateCartTenant(tenantId, cartId);

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

    async clearItems(tenantId: string | undefined, cartId: string): Promise<void> {
        await this.validateCartTenant(tenantId, cartId);

        await prisma.cartItem.deleteMany({
            where: { cartId }
        });
    }

    async getStats(tenantId: string | undefined): Promise<any[]> {
        const tenantFilter = tenantId ? prisma.$queryRaw`AND u."tenantId" = ${tenantId}` : prisma.$queryRaw``;

        // Raw query needs explicit join to filter by user's tenant
        return prisma.$queryRaw`
            SELECT to_char(c."createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
            FROM carts c
            JOIN users u ON c."userId" = u.id
            WHERE c."createdAt" >= NOW() - INTERVAL '1 year'
            ${tenantFilter}
            GROUP BY "yearMonth"
            ORDER BY "yearMonth" ASC
        `;
    }
}
