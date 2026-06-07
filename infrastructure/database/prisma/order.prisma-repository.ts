import {
    Order as PrismaOrder,
    OrderItem as PrismaOrderItem,
    OrderStatus as PrismaOrderStatus,
    Prisma,
} from "@prisma/client";
import { prisma } from "@/config/db.config";
import { IOrderRepository } from "@/core/repositories/order.repository.interface";
import { Order, OrderStatus, OrderItem } from "@/core/entities/order.entity";
import { Product } from "@/core/entities/product.entity";
import {
    CreateOrderDTO,
    UpdateOrderDTO,
} from "@/core/application/dtos/requests/order.request";
import { EntityNotFoundError } from "@/core/domain/errors/domain-errors";

type OrderWithIncludes = Prisma.OrderGetPayload<{
    include: {
        items: { include: { product: true } };
        user: { select: { name: true; email: true } };
    };
}>;

type OrderItemWithProduct = OrderWithIncludes["items"][number];

export class PrismaOrderRepository implements IOrderRepository {
    private mapOrderItem(item: OrderItemWithProduct): OrderItem {
        return {
            id: item.id,
            orderId: item.orderId,
            productId: item.productId,
            amount: item.amount,
            price: Number(item.price),
            product: item.product
                ? ({
                      id: item.product.id,
                      name: item.product.name,
                      description: item.product.description,
                      image: item.product.image,
                      price: Number(item.product.price),
                      ownerId: (item.product as { ownerId: string }).ownerId,
                  } as Product)
                : undefined,
        };
    }

    private mapToEntity(prismaOrder: OrderWithIncludes): Order {
        return {
            id: prismaOrder.id,
            userId: prismaOrder.userId,
            status: prismaOrder.status as OrderStatus,
            trackingNumber: prismaOrder.trackingNumber,
            subtotal: Number(prismaOrder.subtotal),
            total: Number(prismaOrder.total),
            discountAmount: Number(prismaOrder.discountAmount),
            couponId: prismaOrder.couponId,
            items: prismaOrder.items.map((item) => this.mapOrderItem(item)),
            createdAt: prismaOrder.createdAt,
            updatedAt: prismaOrder.updatedAt,
            user: prismaOrder.user,
        };
    }

    async create(tenantId: string, data: CreateOrderDTO): Promise<Order> {
        const subtotal = data.items.reduce(
            (sum, item) => sum + item.price * item.amount,
            0,
        );
        const discountAmount = 0;
        const total = subtotal - discountAmount;

        const order = await prisma.order.create({
            data: {
                userId: data.userId,
                tenantId,
                status: "PENDIENTE" as PrismaOrderStatus,
                couponId: data.couponId,
                subtotal,
                total,
                discountAmount,
                items: {
                    create: data.items.map((item) => ({
                        productId: item.productId,
                        amount: item.amount,
                        price: item.price,
                    })),
                },
            },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return this.mapToEntity(order);
    }

    async findById(tenantId: string, id: string): Promise<Order | null> {
        const order = await prisma.order.findFirst({
            where: { id, tenantId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
        });
        return order ? this.mapToEntity(order) : null;
    }

    async findByUserId(
        tenantId: string,
        userId: string,
        status?: OrderStatus,
    ): Promise<Order[]> {
        const where: Prisma.OrderWhereInput = { userId, tenantId };
        if (status) {
            where.status = status as PrismaOrderStatus;
        }

        const orders = await prisma.order.findMany({
            where,
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return orders.map((o) => this.mapToEntity(o));
    }

    async findAll(tenantId: string): Promise<Order[]> {
        const orders = await prisma.order.findMany({
            where: { tenantId },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
                user: {
                    select: {
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        return orders.map((o) => this.mapToEntity(o));
    }

    async findAllPaginated(
        tenantId: string,
        options: {
            search?: string;
            status?: string;
            page: number;
            limit: number;
            startDate?: Date;
            endDate?: Date;
        },
    ): Promise<{
        orders: Order[];
        total: number;
    }> {
        const { search, status, page, limit, startDate, endDate } = options;

        const where: Prisma.OrderWhereInput = { tenantId };

        if (search) {
            where.OR = [
                { id: { contains: search, mode: "insensitive" } },
                { user: { name: { contains: search, mode: "insensitive" } } },
                { user: { email: { contains: search, mode: "insensitive" } } },
            ];
        }

        if (status && status !== "all") {
            where.status = status as PrismaOrderStatus;
        }

        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where,
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * limit,
                take: limit,
            }),
            prisma.order.count({ where }),
        ]);

        return {
            orders: orders.map((o) => this.mapToEntity(o)),
            total,
        };
    }

    async updateStatus(
        tenantId: string,
        id: string,
        status: OrderStatus,
    ): Promise<Order> {
        try {
            const order = await prisma.order.update({
                where: { id, tenantId },
                data: { status: status as PrismaOrderStatus },
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return this.mapToEntity(order);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Order", id);
            }
            throw error;
        }
    }

    async update(
        tenantId: string,
        id: string,
        data: UpdateOrderDTO,
    ): Promise<Order> {
        const updateData: Prisma.OrderUpdateInput = {};
        if (data.status !== undefined)
            updateData.status = data.status as PrismaOrderStatus;
        if (data.trackingNumber !== undefined)
            updateData.trackingNumber = data.trackingNumber;

        try {
            const order = await prisma.order.update({
                where: { id, tenantId },
                data: updateData,
                include: {
                    items: {
                        include: {
                            product: true,
                        },
                    },
                    user: {
                        select: {
                            name: true,
                            email: true,
                        },
                    },
                },
            });
            return this.mapToEntity(order);
        } catch (error: unknown) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2025"
            ) {
                throw new EntityNotFoundError("Order", id);
            }
            throw error;
        }
    }

    async getStats(
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalOrders: number;
        totalRevenue: number;
        statusCounts: Record<string, number>;
    }> {
        const where: Prisma.OrderWhereInput = { tenantId };
        if (startDate && endDate) {
            where.createdAt = {
                gte: startDate,
                lte: endDate,
            };
        }

        const [aggregations, allOrders] = await Promise.all([
            prisma.order.aggregate({
                where,
                _count: { id: true },
                _sum: { total: true },
            }),
            prisma.order.findMany({
                where,
                select: { status: true },
            }),
        ]);

        const statusCounts = allOrders.reduce(
            (acc: Record<string, number>, order) => {
                const status = order.status as string;
                acc[status] = (acc[status] || 0) + 1;
                return acc;
            },
            {},
        );

        return {
            totalOrders: aggregations._count.id,
            totalRevenue: Number(aggregations._sum.total || 0),
            statusCounts,
        };
    }
}
