import { Order, CreateOrderDTO, UpdateOrderDTO, OrderStatus } from '@/core/entities/order.entity';

export interface IOrderRepository {
    create(data: CreateOrderDTO): Promise<Order>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string, status?: OrderStatus): Promise<Order[]>;
    findAll(): Promise<Order[]>;
    findAllPaginated(options: {
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
    updateStatus(id: string, status: OrderStatus): Promise<Order>;
    update(id: string, data: UpdateOrderDTO): Promise<Order>;
    getStats(startDate?: Date, endDate?: Date): Promise<{
        totalOrders: number;
        totalRevenue: number;
        statusCounts: Record<string, number>;
    }>;
}
