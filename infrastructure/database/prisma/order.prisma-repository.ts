import { prisma } from '@/config/db.config';
import { IOrderRepository } from '@/core/repositories/order.repository.interface';
import { Order, CreateOrderDTO, OrderStatus } from '@/core/entities/order.entity';
import { OrderStatus as PrismaOrderStatus } from '@prisma/client';

export class PrismaOrderRepository implements IOrderRepository {
    async create(data: CreateOrderDTO): Promise<Order> {
        const subtotal = data.items.reduce((sum, item) => sum + (item.price * item.amount), 0);
        const discountAmount = 0;
        const total = subtotal - discountAmount;

        const order = await prisma.order.create({
            data: {
                userId: data.userId,
                status: 'PENDIENTE',
                couponId: data.couponId,
                subtotal,
                total,
                discountAmount,
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

    async findByUserId(userId: string, status?: OrderStatus): Promise<Order[]> {
        const whereClause: any = { userId };
        if (status) {
            whereClause.status = status;
        }

        const orders = await prisma.order.findMany({
            where: whereClause,
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

    async findAllPaginated(options: {
        search?: string;
        status?: string;
        page: number;
        limit: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        orders: Order[];
        total: number;
    }> {
        const { search, status, page, limit, startDate, endDate } = options;

        // Build where clause
        const where: any = {};

        // Search filter (search in order ID, user name, or user email)
        if (search) {
            where.OR = [
                { id: { contains: search, mode: 'insensitive' } },
                { user: { name: { contains: search, mode: 'insensitive' } } },
                { user: { email: { contains: search, mode: 'insensitive' } } }
            ];
        }

        // Status filter
        if (status && status !== 'all') {
            where.status = status;
        }

        // Date filter
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        // Execute queries in parallel
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
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
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit
            }),
            prisma.order.count({ where })
        ]);

        return {
            orders: orders.map(this.mapToEntity),
            total
        };
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

    async update(id: string, data: any): Promise<Order> {

        const order = await prisma.order.update({
            where: { id },
            data: {
                status: data.status ? (data.status as PrismaOrderStatus) : undefined,
                trackingNumber: data.trackingNumber
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

    async getStats(startDate?: Date, endDate?: Date): Promise<{ totalOrders: number; totalRevenue: number; statusCounts: Record<string, number> }> {

        const where: any = {};
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate
            };
        }

        const [aggregations, allOrders] = await Promise.all([
            prisma.order.aggregate({
                where,
                _count: {
                    id: true
                },
                _sum: {
                    total: true
                }
            }),
            prisma.order.findMany({
                where,
                select: {
                    status: true
                }
            })
        ]);

        // Calculate status counts
        const statusCounts = allOrders.reduce((acc: Record<string, number>, order) => {
            const status = order.status;
            acc[status] = (acc[status] || 0) + 1;
            return acc;
        }, {});

        return {
            totalOrders: aggregations._count.id,
            totalRevenue: Number(aggregations._sum.total || 0),
            statusCounts
        };
    }

    private mapToEntity(prismaOrder: any): Order {
        return {
            id: prismaOrder.id,
            userId: prismaOrder.userId,
            status: prismaOrder.status as OrderStatus,
            trackingNumber: prismaOrder.trackingNumber,
            subtotal: Number(prismaOrder.subtotal),
            total: Number(prismaOrder.total),
            discountAmount: Number(prismaOrder.discountAmount),
            couponId: prismaOrder.couponId,
            items: prismaOrder.items.map((item: any) => ({
                id: item.id,
                orderId: item.orderId,
                productId: item.productId,
                amount: item.amount,
                price: Number(item.price),
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
