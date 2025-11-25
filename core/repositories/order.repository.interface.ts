import { Order, CreateOrderDTO, OrderStatus } from '../entities/order.entity';

export interface IOrderRepository {
    create(data: CreateOrderDTO): Promise<Order>;
    findById(id: string): Promise<Order | null>;
    findByUserId(userId: string): Promise<Order[]>;
    findAll(): Promise<Order[]>;
    updateStatus(id: string, status: OrderStatus): Promise<Order>;
}
