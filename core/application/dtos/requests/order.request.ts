import { OrderStatus } from "@/core/entities/order.entity";

export interface CreateOrderDTO {
    userId: string;
    items: {
        productId: string;
        amount: number;
        price: number;
    }[];
    couponId?: string;
}

export interface UpdateOrderDTO {
    status?: OrderStatus;
    trackingNumber?: string;
}

export interface ChangeOrderStatusDTO {
    idOrder: string;
    status: OrderStatus;
}
