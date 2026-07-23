import { Product as PrismaProduct, Prisma } from "@prisma/client";
import { prisma } from "@/config/db.config";
import {
    IProductRepository,
    CreateProductData,
    UpdateProductData,
} from "@/core/repositories/product.repository.interface";
import { Product } from "@/core/entities/product.entity";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

type ProductWithCategories = Prisma.ProductGetPayload<{
    include: { categories: true };
}>;

export class PrismaProductRepository implements IProductRepository {
    private mapToEntity(prismaProduct: ProductWithCategories): Product {
        return {
            id: prismaProduct.id,
            name: prismaProduct.name,
            description: prismaProduct.description,
            image: prismaProduct.image,
            price: prismaProduct.price,
            stock: prismaProduct.stock,
            active: prismaProduct.active,
            ownerId: prismaProduct.ownerId,
            createdAt: prismaProduct.createdAt,
            updatedAt: prismaProduct.updatedAt,
            categories: prismaProduct.categories,
        };
    }

    async findAll(
        tenantId: string | undefined,
        options?: { categoryId?: string },
    ): Promise<Product[]> {
        const where: Prisma.ProductWhereInput = {
            ...(tenantId && { tenantId }),
        };

        if (options?.categoryId) {
            where.categories = {
                some: { id: options.categoryId },
            };
        }

        const products = await prisma.product.findMany({
            where,
            include: { categories: true },
            orderBy: { createdAt: "desc" },
        });
        return products.map((p) => this.mapToEntity(p));
    }

    async findById(
        tenantId: string | undefined,
        id: string,
    ): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: { id, ...(tenantId && { tenantId }) },
            include: { categories: true },
        });
        return product ? this.mapToEntity(product) : null;
    }

    async create(tenantId: string, data: CreateProductData): Promise<Product> {
        const { categoryIds, ...productData } = data;
        const product = await prisma.product.create({
            data: {
                name: productData.name,
                price: productData.price,
                description: productData.description,
                image: productData.image,
                stock: productData.stock,
                active: productData.active,
                ownerId: productData.ownerId,
                tenantId,
                categories: categoryIds
                    ? {
                          connect: categoryIds.map((id) => ({ id })),
                      }
                    : undefined,
            },
            include: { categories: true },
        });
        return this.mapToEntity(product);
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateProductData,
    ): Promise<Product> {
        const { categoryIds, ...productData } = data;

        try {
            const product = await prisma.product.update({
                where: { id, tenantId },
                data: {
                    name: productData.name,
                    price: productData.price,
                    description: productData.description,
                    image: productData.image,
                    stock: productData.stock,
                    active: productData.active,
                    categories: categoryIds
                        ? {
                              set: categoryIds.map((id) => ({ id })),
                          }
                        : undefined,
                },
                include: { categories: true },
            });
            return this.mapToEntity(product);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Product", id);
            }
            throw error;
        }
    }

    async delete(tenantId: string, id: string): Promise<Product> {
        try {
            const product = await prisma.product.delete({
                where: { id, tenantId },
                include: { categories: true },
            });
            return this.mapToEntity(product);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Product", id);
            }
            throw error;
        }
    }

    async searchByName(tenantId: string, name: string): Promise<Product[]> {
        const products = await prisma.product.findMany({
            where: {
                tenantId,
                name: { contains: name, mode: "insensitive" },
            },
            include: { categories: true },
        });
        return products.map((p) => this.mapToEntity(p));
    }

    async getStats(
        tenantId: string | undefined,
    ): Promise<{ _id: string; total: number }[]> {
        const whereClause = tenantId
            ? prisma.$queryRaw`AND "tenantId" = ${tenantId}`
            : prisma.$queryRaw``;

        const result: { yearMonth: string; total: number }[] =
            await prisma.$queryRaw`
      SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
      FROM products
      WHERE "createdAt" >= NOW() - INTERVAL '1 year'
      ${whereClause}
      GROUP BY "yearMonth"
      ORDER BY "yearMonth" ASC
    `;
        return result.map((r) => ({
            _id: r.yearMonth,
            total: r.total,
        }));
    }

    async getSummaryStats(tenantId: string | undefined): Promise<{
        totalProducts: number;
        totalValue: number;
        lowStockCount: number;
        outOfStockCount: number;
    }> {
        const where: Prisma.ProductWhereInput = {
            ...(tenantId && { tenantId }),
        };

        const [totalProducts, lowStockCount, outOfStockCount] =
            await Promise.all([
                prisma.product.count({ where }),
                prisma.product.count({
                    where: { ...where, stock: { lt: 10 } },
                }),
                prisma.product.count({
                    where: { ...where, stock: 0 },
                }),
            ]);

        const allProducts = await prisma.product.findMany({
            where,
            select: { price: true, stock: true },
        });
        const totalValue = allProducts.reduce(
            (sum, p) => sum + p.price * p.stock,
            0,
        );

        return {
            totalProducts,
            totalValue: Number(totalValue),
            lowStockCount,
            outOfStockCount,
        };
    }

    async findFirst(
        tenantId: string,
        where: Partial<Product>,
    ): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: {
                ...(where as Prisma.ProductWhereInput),
                tenantId,
            },
            include: { categories: true },
        });
        return product ? this.mapToEntity(product) : null;
    }
}
