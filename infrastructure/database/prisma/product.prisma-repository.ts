import { prisma } from '@/config/db.config';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Product, CreateProductDTO, UpdateProductDTO } from '@/core/entities/product.entity';

/**
 * Tenant-Aware Product Repository
 * All queries are automatically scoped to the provided tenantId
 */
export class PrismaProductRepository implements IProductRepository {
    async findAll(tenantId: string | undefined, options?: { categoryId?: string }): Promise<Product[]> {
        const where: any = { ...(tenantId && { tenantId }) };

        if (options?.categoryId) {
            where.categories = {
                some: {
                    id: options.categoryId
                }
            };
        }

        const products = await prisma.product.findMany({
            where,
            include: { categories: true },
            orderBy: { createdAt: 'desc' }
        });
        return products.map(this.mapToEntity);
    }

    async findById(tenantId: string | undefined, id: string): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: {
                id,
                ...(tenantId && { tenantId })
            },
            include: { categories: true }
        });
        return product ? this.mapToEntity(product) : null;
    }

    async create(tenantId: string, data: CreateProductDTO): Promise<Product> {
        const { categoryIds, ...productData } = data;
        const product = await prisma.product.create({
            data: {
                ...productData,
                tenantId, // Automatically assign tenant
                categories: categoryIds ? {
                    connect: categoryIds.map(id => ({ id }))
                } : undefined
            },
            include: { categories: true }
        });
        return this.mapToEntity(product);
    }

    async update(tenantId: string, id: string, data: UpdateProductDTO): Promise<Product> {
        const { categoryIds, ...productData } = data;

        // Ensure product belongs to tenant before updating
        const product = await prisma.product.update({
            where: {
                id,
                tenantId // Compound condition ensures tenant ownership
            },
            data: {
                ...productData,
                categories: categoryIds ? {
                    set: categoryIds.map(id => ({ id }))
                } : undefined
            },
            include: { categories: true }
        });
        return this.mapToEntity(product);
    }

    async delete(tenantId: string, id: string): Promise<Product> {
        const product = await prisma.product.delete({
            where: {
                id,
                tenantId // Ensures only tenant's own products can be deleted
            },
            include: { categories: true }
        });
        return this.mapToEntity(product);
    }

    async searchByName(tenantId: string, name: string): Promise<Product[]> {
        const products = await prisma.product.findMany({
            where: {
                tenantId,
                name: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            include: { categories: true }
        });
        return products.map(this.mapToEntity);
    }

    async getStats(tenantId: string | undefined): Promise<any[]> {
        const whereClause = tenantId ? prisma.$queryRaw`AND "tenantId" = ${tenantId}` : prisma.$queryRaw``;

        const result: any[] = await prisma.$queryRaw`
            SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
            FROM products
            WHERE "createdAt" >= NOW() - INTERVAL '1 year'
              ${whereClause}
            GROUP BY "yearMonth"
            ORDER BY "yearMonth" ASC
        `;
        return result.map(r => ({
            _id: r.yearMonth,
            total: r.total
        }));
    }

    async getSummaryStats(tenantId: string | undefined): Promise<{ totalProducts: number; totalValue: number; lowStockCount: number; outOfStockCount: number }> {
        const where: any = { ...(tenantId && { tenantId }) };

        const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
            prisma.product.count({ where }),
            prisma.product.count({
                where: {
                    ...where,
                    stock: { lt: 10 }
                }
            }),
            prisma.product.count({
                where: {
                    ...where,
                    stock: 0
                }
            })
        ]);

        // Calculate total value (price * stock) scoped to tenant or global
        const allProducts = await prisma.product.findMany({
            where,
            select: { price: true, stock: true }
        });
        const totalValue = allProducts.reduce((sum, p) => sum + (p.price * p.stock), 0);

        return {
            totalProducts,
            totalValue: Number(totalValue),
            lowStockCount,
            outOfStockCount
        };
    }

    async findFirst(tenantId: string, where: Partial<Product>): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: {
                ...where as any,
                tenantId // Always include tenant filter
            },
            include: { categories: true }
        });
        return product ? this.mapToEntity(product) : null;
    }

    private mapToEntity(prismaProduct: any): Product {
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
            categories: prismaProduct.categories
        };
    }
}
