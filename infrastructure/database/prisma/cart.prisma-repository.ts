import { Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import { ICartRepository } from "@/core/repositories/cart.repository.interface";
import { Cart, CartItem } from "@/core/entities/cart.entity";
import { Product } from "@/core/entities/product.entity";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

type CartProduct = Pick<Product, "id" | "name" | "price" | "image" | "stock">;

interface CartStats {
    yearMonth: string;
    total: number;
}

type PrismaCartWithItems = Prisma.CartGetPayload<{
    include: { items: { include: { product: true } } };
}>;

type PrismaCartWithSimpleItems = Prisma.CartGetPayload<{
    include: { items: true };
}>;

type PrismaCartItem = Prisma.CartItemGetPayload<{}>;

export class PrismaCartRepository implements ICartRepository {
    private mapProduct(data: {
        id: string;
        name: string;
        price: number;
        image: string | null;
        stock: number;
    }): CartProduct {
        return {
            id: data.id,
            name: data.name,
            price: data.price,
            image: data.image,
            stock: data.stock,
        };
    }

    private mapCartItem(
        data: PrismaCartItem,
        product?: {
            id: string;
            name: string;
            price: number;
            image: string | null;
            stock: number;
        },
    ): CartItem {
        return {
            id: data.id,
            cartId: data.cartId,
            productId: data.productId,
            amount: data.amount,
            product: product ? this.mapProduct(product) : undefined,
        };
    }

    private mapToEntity(
        data: PrismaCartWithItems | PrismaCartWithSimpleItems,
    ): Cart {
        return {
            id: data.id,
            userId: data.userId,
            items: (data.items ?? []).map(
                (
                    item: PrismaCartItem & {
                        product?: {
                            id: string;
                            name: string;
                            price: number;
                            image: string | null;
                            stock: number;
                        };
                    },
                ) => this.mapCartItem(item, item.product),
            ),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        };
    }

    private async validateCartTenant(
        tenantId: string | undefined,
        cartId: string,
    ): Promise<void> {
        const count = await prisma.cart.count({
            where: { id: cartId },
        });
        if (count === 0) {
            throw new EntityNotFoundError("Cart", cartId);
        }
    }

    async findByUserId(
        tenantId: string | undefined,
        userId: string,
    ): Promise<Cart | null> {
        const cart = await prisma.cart.findFirst({
            where: { userId },
            include: {
                items: {
                    include: { product: true },
                },
            },
        });
        if (!cart) return null;
        return this.mapToEntity(cart);
    }

    async findByUserIdSimple(
        tenantId: string | undefined,
        userId: string,
    ): Promise<Cart | null> {
        const cart = await prisma.cart.findFirst({
            where: { userId },
            include: { items: true },
        });
        if (!cart) return null;
        return this.mapToEntity(cart);
    }

    async create(tenantId: string | undefined, userId: string): Promise<Cart> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });

        if (!user) {
            throw new EntityNotFoundError("User", userId);
        }

        const cart = await prisma.cart.create({
            data: { userId },
            include: { items: { include: { product: true } } },
        });
        return this.mapToEntity(cart);
    }

    async addItem(
        tenantId: string | undefined,
        cartId: string,
        productId: string,
        amount: number,
    ): Promise<CartItem> {
        await this.validateCartTenant(tenantId, cartId);

        const item = await prisma.cartItem.create({
            data: { cartId, productId, amount },
        });
        return this.mapCartItem(item);
    }

    async removeItem(
        tenantId: string | undefined,
        cartId: string,
        productId: string,
    ): Promise<void> {
        await this.validateCartTenant(tenantId, cartId);

        await prisma.cartItem.delete({
            where: {
                cartId_productId: { cartId, productId },
            },
        });
    }

    async updateItemAmount(
        tenantId: string | undefined,
        cartId: string,
        productId: string,
        amount: number,
    ): Promise<CartItem> {
        await this.validateCartTenant(tenantId, cartId);

        const item = await prisma.cartItem.update({
            where: {
                cartId_productId: { cartId, productId },
            },
            data: { amount },
        });
        return this.mapCartItem(item);
    }

    async clearItems(
        tenantId: string | undefined,
        cartId: string,
    ): Promise<void> {
        await this.validateCartTenant(tenantId, cartId);

        await prisma.cartItem.deleteMany({
            where: { cartId },
        });
    }

    async getStats(tenantId: string | undefined): Promise<CartStats[]> {
        const tenantFilter = tenantId
            ? prisma.$queryRaw`AND u."tenantId" = ${tenantId}`
            : prisma.$queryRaw``;

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
