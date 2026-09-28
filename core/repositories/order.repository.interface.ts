import type { Order, OrderStatus } from "@/core/entities/order.entity";

export interface OrderCreateData {
    userId: string;
    items: { productId: string; amount: number; price: number }[];
    couponId?: string;
}

export interface OrderUpdateData {
    trackingNumber?: string;
}

export interface OrderStatusUpdate {
    expectedStatus: OrderStatus;
    status: OrderStatus;
    qualifyLoyalty?: true;
    trackingNumber?: string;
}

/**
 * Order Repository Interface - Tenant-Scoped
 */
export interface IOrderRepository {
    /**
     * Creates an order and adjusts product inventory atomically.
     * Each stock adjustment is guarded (stock >= amount); if any product
     * lacks sufficient stock the whole operation rolls back.
     * When couponId is provided, it is revalidated and consumed in the same
     * transaction before the order totals are persisted.
     */
    createWithInventoryAdjustment(
        tenantId: string,
        data: OrderCreateData,
        adjustments: Array<{ productId: string; amount: number }>,
    ): Promise<Order>;
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
        page: number;
        limit: number;
        totalPages: number;
    }>;
    updateStatus(
        tenantId: string,
        id: string,
        data: OrderStatusUpdate,
    ): Promise<Order | null>;
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
