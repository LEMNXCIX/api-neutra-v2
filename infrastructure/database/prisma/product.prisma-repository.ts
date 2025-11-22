import { prisma } from '../../../config/db.config';
import { IProductRepository } from '../../../core/repositories/product.repository.interface';
import { Product, CreateProductDTO, UpdateProductDTO } from '../../../core/entities/product.entity';

export class PrismaProductRepository implements IProductRepository {
    async findAll(): Promise<Product[]> {
        const products = await prisma.product.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return products.map(this.mapToEntity);
    }

    async findById(id: string): Promise<Product | null> {
        const product = await prisma.product.findUnique({
            where: { id }
        });
        return product ? this.mapToEntity(product) : null;
    }

    async create(data: CreateProductDTO): Promise<Product> {
        const product = await prisma.product.create({
            data: {
                name: data.name,
                description: data.description,
                image: data.image,
                price: data.price,
                ownerId: data.ownerId
            }
        });
        return this.mapToEntity(product);
    }

    async update(id: string, data: UpdateProductDTO): Promise<Product> {
        const product = await prisma.product.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                image: data.image,
                price: data.price
            }
        });
        return this.mapToEntity(product);
    }

    async delete(id: string): Promise<Product> {
        const product = await prisma.product.delete({
            where: { id }
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
            }
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

    async findFirst(where: Partial<Product>): Promise<Product | null> {
        const product = await prisma.product.findFirst({
            where: where as any
        });
        return product ? this.mapToEntity(product) : null;
    }

    private mapToEntity(prismaProduct: any): Product {
        return {
            id: prismaProduct.id,
            name: prismaProduct.name,
            description: prismaProduct.description,
            image: prismaProduct.image,
            price: prismaProduct.price, // Decimal to number conversion might be needed if Prisma returns Decimal
            ownerId: prismaProduct.ownerId,
            createdAt: prismaProduct.createdAt,
            updatedAt: prismaProduct.updatedAt
        };
    }
}
