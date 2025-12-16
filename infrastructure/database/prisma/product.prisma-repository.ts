import { prisma } from '@/config/db.config';
import { IProductRepository } from '@/core/repositories/product.repository.interface';
import { Product, CreateProductDTO, UpdateProductDTO } from '@/core/entities/product.entity';

export class PrismaProductRepository implements IProductRepository {
    async findAll(options?: { categoryId?: string }): Promise<Product[]> {
        const where: any = {};
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

    async findById(id: string): Promise<Product | null> {
        const product = await prisma.product.findUnique({
            where: { id },
            include: { categories: true }
        });
        return product ? this.mapToEntity(product) : null;
    }

    async create(data: CreateProductDTO): Promise<Product> {
        const { categoryIds, ...productData } = data;
        const product = await prisma.product.create({
            data: {
                ...productData,
                categories: categoryIds ? {
                    connect: categoryIds.map(id => ({ id }))
                } : undefined
            },
            include: { categories: true }
        });
        return this.mapToEntity(product);
    }

    async update(id: string, data: UpdateProductDTO): Promise<Product> {
        const { categoryIds, ...productData } = data;
        const product = await prisma.product.update({
            where: { id },
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

    async delete(id: string): Promise<Product> {
        const product = await prisma.product.delete({
            where: { id },
            include: { categories: true }
        });
        return this.mapToEntity(product);
    }

    async searchByName(name: string): Promise<Product[]> {
        const products = await prisma.product.findMany({
            where: {
                name: {
                    contains: name,
                    mode: 'insensitive'
                }
            },
            include: { categories: true }
        });
        return products.map(this.mapToEntity);
    }

    async getStats(): Promise<any[]> {
        const result: any[] = await prisma.$queryRaw`
            SELECT to_char("createdAt", 'YYYY-MM') as "yearMonth", COUNT(*)::int as total
            FROM products
            WHERE "createdAt" >= NOW() - INTERVAL '1 year'
            GROUP BY "yearMonth"
            ORDER BY "yearMonth" ASC
        `;
        return result.map(r => ({
            _id: r.yearMonth,
            total: r.total
        }));
    }

    async getSummaryStats(): Promise<{ totalProducts: number; totalValue: number; lowStockCount: number; outOfStockCount: number }> {
        const [totalProducts, lowStockCount, outOfStockCount] = await Promise.all([
            prisma.product.count(),
            prisma.product.count({
                where: {
                    stock: { lt: 10 }
                }
            }),
            prisma.product.count({
                where: {
                    stock: 0
                }
            })
        ]);

        // Calculate total value (price * stock) in memory for reliability
        const allProducts = await prisma.product.findMany({
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

    async findFirst(where: Partial<Product>): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: where as any,
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
