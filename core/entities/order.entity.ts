import { Product } from "@/core/entities/product.entity";

export type OrderStatus = "PENDIENTE" | "PAGADO" | "ENVIADO" | "ENTREGADO";

export interface OrderItem {
    id: string;
    orderId: string;
    productId: string;
    amount: number;
    price: number;
    product?: Product;
}

export interface Order {
    id: string;
    userId: string;
    status: OrderStatus;
    items: OrderItem[];
    subtotal: number;
    total: number;
    discountAmount: number;
    couponId?: string | null;
    createdAt: Date;
    updatedAt: Date;
    user?: {
        name: string;
        email: string;
    };
    trackingNumber?: string | null;
}

export function canTransitionTo(
    current: OrderStatus,
    next: OrderStatus,
): boolean {
    const transitions: Record<OrderStatus, OrderStatus[]> = {
        PENDIENTE: ["PAGADO"],
        PAGADO: ["ENVIADO"],
        ENVIADO: ["ENTREGADO"],
        ENTREGADO: [],
    };
    return transitions[current]?.includes(next) ?? false;
}

export function isPaid(order: Order): boolean {
    return order.status !== "PENDIENTE";
}
