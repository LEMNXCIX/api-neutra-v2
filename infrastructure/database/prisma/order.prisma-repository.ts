import { prisma } from '../../../config/db.config';
import { IOrderRepository } from '../../../core/repositories/order.repository.interface';
import { Order, CreateOrderDTO, OrderStatus } from '../../../core/entities/order.entity';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';

export class PrismaOrderRepository implements IOrderRepository {
    async create(data: CreateOrderDTO): Promise<Order> {
        const order = await prisma.order.create({
            data: {
                userId: data.userId,
                status: 'PENDIENTE',
                items: {
                    create: data.items.map(item => ({
                        productId: item.productId,
                        amount: item.amount,
                        price: item.price
                    }))
                }
            },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        return this.mapToEntity(order);
    }

    async findById(id: string): Promise<Order | null> {
        const order = await prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        return order ? this.mapToEntity(order) : null;
    }

    async findByUserId(userId: string): Promise<Order[]> {
        const orders = await prisma.order.findMany({
            where: { userId },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return orders.map(this.mapToEntity);
    }

    async findAll(): Promise<Order[]> {
        const orders = await prisma.order.findMany({
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return orders.map(this.mapToEntity);
    }

    async updateStatus(id: string, status: OrderStatus): Promise<Order> {
        const order = await prisma.order.update({
            where: { id },
            data: { status: status as PrismaOrderStatus },
            include: {
                items: {
                    include: {
                        product: true
                    }
                },
                user: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            }
        });
        return this.mapToEntity(order);
    }

    private mapToEntity(prismaOrder: any): Order {
        return {
            id: prismaOrder.id,
            userId: prismaOrder.userId,
            status: prismaOrder.status as OrderStatus,
            items: prismaOrder.items.map((item: any) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                amount: item.amount,
                price: Number(item.price), // Ensure number
                product: item.product ? {
                    id: item.product.id,
                    name: item.product.name,
                    description: item.product.description,
                    image: item.product.image,
                    price: Number(item.product.price),
                    ownerId: item.product.ownerId
                } : undefined
            })),
            createdAt: prismaOrder.createdAt,
            updatedAt: prismaOrder.updatedAt,
            user: prismaOrder.user
        };
    }
}
