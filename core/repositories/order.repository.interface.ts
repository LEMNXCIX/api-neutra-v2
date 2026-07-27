import { Order, OrderStatus } from "@/core/entities/order.entity";

export interface OrderCreateData {
    userId: string;
    items: { productId: string; amount: number; price: number }[];
    couponId?: string;
}

export interface OrderUpdateData {
    status?: OrderStatus;
    trackingNumber?: string;
}

/**
 * Order Repository Interface - Tenant-Scoped
 */
export interface IOrderRepository {
    create(tenantId: string, data: OrderCreateData): Promise<Order>;
    findById(tenantId: string, id: string): Promise<Order | null>;
    findByUserId(
        tenantId: string,
        userId: string,
        status?: OrderStatus,
    ): Promise<Order[]>;
    findAll(tenantId: string): Promise<Order[]>;
    findAllPaginated(
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
    }>;
    updateStatus(
        tenantId: string,
        id: string,
        status: OrderStatus,
    ): Promise<Order>;
    update(tenantId: string, id: string, data: OrderUpdateData): Promise<Order>;
    getStats(
        tenantId: string,
        startDate?: Date,
        endDate?: Date,
    ): Promise<{
        totalOrders: number;
        totalRevenue: number;
        statusCounts: Record<string, number>;
    }>;
}
