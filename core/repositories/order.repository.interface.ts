import { Order, CreateOrderDTO, UpdateOrderDTO, OrderStatus } from '@/core/entities/order.entity';

/**
 * Order Repository Interface - Tenant-Scoped
 */
export interface IOrderRepository {
    create(tenantId: string, data: CreateOrderDTO): Promise<Order>;
    findById(tenantId: string, id: string): Promise<Order | null>;
    findByUserId(tenantId: string, userId: string, status?: OrderStatus): Promise<Order[]>;
    findAll(tenantId: string): Promise<Order[]>;
    findAllPaginated(tenantId: string, options: {
        search?: string;
        status?: string;
        page: number;
        limit: number;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        orders: Order[];
        total: number;
    }>;
    updateStatus(tenantId: string, id: string, status: OrderStatus): Promise<Order>;
    update(tenantId: string, id: string, data: UpdateOrderDTO): Promise<Order>;
    getStats(tenantId: string, startDate?: Date, endDate?: Date): Promise<{
        totalOrders: number;
        totalRevenue: number;
        statusCounts: Record<string, number>;
    }>;
}
